import { summaryApplicationError } from '../errors/process-ai-summary-errors.js';
import { processNotFound } from '../errors/process-errors.js';
import {
  findLatestProcessAiSummary,
  findLatestProcessSummaryAttempt,
  findProcessSummaryAttempt,
  readCurrentProcessAiSummary,
} from '../repositories/process-ai-summary-repository.js';
import { expireOverdueSummaryAttempt } from '../repositories/summary-attempt-repository.js';
import { providerSummaryJsonSchema } from '../schemas/process-ai-summary-schema.js';
import type { AiSummaryState, PreparedSummarySource, SummaryReadInput } from '../types/process-ai-summary.js';
import { SUMMARY_INSTRUCTIONS, SUMMARY_RULES_VERSION } from './summary-prompt-service.js';
import { estimateSummaryCapacity } from './summary-source-service.js';
import { serializeProcessAiSummary } from './summary-serialization-service.js';
import type { ProcessAiSummaryServiceDependencies } from './process-ai-summary-service.js';

export type { SummaryReadInput } from '../types/process-ai-summary.js';

function currentTime(dependencies: ProcessAiSummaryServiceDependencies): Date {
  return dependencies.now?.() ?? new Date();
}

function state(input: {
  processId: number;
  status: AiSummaryState['status'];
  serverTime: Date;
  attempt?: AiSummaryState['attempt'];
  message?: string | null;
  failureCode?: string | null;
  action?: AiSummaryState['action'];
}): AiSummaryState {
  return {
    processId: input.processId,
    status: input.status,
    summary: null,
    attempt: input.attempt ?? null,
    message: input.message ?? null,
    failureCode: input.failureCode ?? null,
    action: input.action ?? 'none',
    serverTime: input.serverTime.toISOString(),
  };
}

function readFailure(): Error {
  return summaryApplicationError({ code: 'SUMMARY_READ_FAILED', message: 'Não foi possível carregar o resumo', status: 503 });
}

function publicAttempt(attempt: {
  id: string;
  startedAt: Date;
  deadlineAt: Date;
  slot: { retryAt: Date | null };
}): NonNullable<AiSummaryState['attempt']> {
  return {
    id: attempt.id,
    startedAt: attempt.startedAt.toISOString(),
    deadlineAt: attempt.deadlineAt.toISOString(),
    retryAt: attempt.slot.retryAt?.toISOString() ?? null,
  };
}

function failureState(input: {
  processId: number;
  now: Date;
  attempt: NonNullable<Awaited<ReturnType<typeof findLatestProcessSummaryAttempt>>>;
}): AiSummaryState {
  const failureCode = input.attempt.failureCode === 'timeout' ? 'GENERATION_TIMEOUT' : input.attempt.failureCode ?? 'GENERATION_ERROR';
  const messages: Record<string, string> = {
    PROVIDER_RATE_LIMIT: 'A geração está temporariamente indisponível. Aguarde para tentar novamente',
    GENERATION_TIMEOUT: 'A geração demorou mais que o esperado. Tente novamente',
    INVALID_OUTPUT: 'Não foi possível gerar um resumo válido',
    SUMMARY_SAVE_FAILED: 'Não foi possível salvar o resumo. Tente novamente',
  };
  return state({
    processId: input.processId,
    status: 'failed',
    serverTime: input.now,
    attempt: publicAttempt(input.attempt),
    message: messages[failureCode] ?? 'Não foi possível gerar o resumo agora',
    failureCode,
    action: 'retry',
  });
}

function capacityFits(source: PreparedSummarySource, dependencies: ProcessAiSummaryServiceDependencies): boolean {
  return estimateSummaryCapacity({
    movements: source.movements,
    instructions: SUMMARY_INSTRUCTIONS,
    schema: providerSummaryJsonSchema,
    capacity: dependencies.configuration.contextCapacity,
  }).fits;
}

async function validateAttemptQuery(input: SummaryReadInput, dependencies: ProcessAiSummaryServiceDependencies): Promise<void> {
  if (!input.attemptId) return;
  const attempt = await findProcessSummaryAttempt(input.attemptId, input.processId, dependencies.client);
  if (!attempt) throw summaryApplicationError({
    code: 'SUMMARY_NOT_FOUND', message: 'A tentativa de geração não foi encontrada.', status: 404,
  });
}

async function loadWithoutSummary(input: {
  processId: number;
  source: PreparedSummarySource;
  sourceRevision: number;
}, dependencies: ProcessAiSummaryServiceDependencies): Promise<AiSummaryState> {
  const { processId, source, sourceRevision } = input;
  const now = currentTime(dependencies);
  if (source.eligibility === 'no_movements') return state({
    processId, status: 'no_movements', serverTime: now, message: 'Não há movimentações disponíveis para gerar um resumo',
  });
  if (source.eligibility !== 'eligible') return state({
    processId, status: 'insufficient_data', serverTime: now, message: 'As informações disponíveis são insuficientes para gerar um resumo',
  });
  if (!capacityFits(source, dependencies)) return state({
    processId, status: 'context_exceeded', serverTime: now,
    message: 'Este histórico excede o limite disponível para gerar um resumo completo. Consulte as movimentações',
  });
  const attempt = await findLatestProcessSummaryAttempt({ processId, sourceRevision, rulesVersion: SUMMARY_RULES_VERSION }, dependencies.client);
  const activeAttempt = await currentAttemptState({ processId, now, attempt }, dependencies);
  return activeAttempt ?? staleOrInitialState(processId, now, dependencies);
}

async function currentAttemptState(input: {
  processId: number;
  now: Date;
  attempt: Awaited<ReturnType<typeof findLatestProcessSummaryAttempt>>;
}, dependencies: ProcessAiSummaryServiceDependencies): Promise<AiSummaryState | null> {
  const { processId, now, attempt } = input;
  if (!attempt) return null;
  if (attempt.status === 'running' && attempt.deadlineAt <= now) {
    await expireOverdueSummaryAttempt(attempt.id, now, dependencies.client);
    return failureState({ processId, now, attempt: { ...attempt, status: 'expired', failureCode: 'timeout' } });
  }
  if (attempt.status === 'running') return state({
    processId, status: 'generating', serverTime: now, attempt: publicAttempt(attempt), message: 'Gerando resumo…',
  });
  return attempt.status === 'succeeded' ? null : failureState({ processId, now, attempt });
}

async function staleOrInitialState(
  processId: number,
  now: Date,
  dependencies: ProcessAiSummaryServiceDependencies,
): Promise<AiSummaryState> {
  const latestSummary = await findLatestProcessAiSummary(processId, dependencies.client);
  if (!latestSummary) return state({ processId, status: 'not_generated', serverTime: now, action: 'generate' });
  const rulesChanged = latestSummary.slot.rulesVersion !== SUMMARY_RULES_VERSION;
  return state({
    processId,
    status: 'stale',
    serverTime: now,
    message: rulesChanged ? 'É necessário atualizar o resumo' : 'As movimentações mudaram. Gere um resumo atualizado',
    failureCode: rulesChanged ? 'RULES_CHANGED' : 'SOURCE_CHANGED',
    action: 'update',
  });
}

export async function loadProcessAiSummaryState(
  input: SummaryReadInput,
  dependencies: ProcessAiSummaryServiceDependencies,
): Promise<AiSummaryState> {
  try {
    await validateAttemptQuery(input, dependencies);
    const current = await readCurrentProcessAiSummary({
      processId: input.processId,
      rulesVersion: SUMMARY_RULES_VERSION,
      userId: input.userId,
    }, dependencies.client);
    if (!current) throw processNotFound();
    if (!current.summary) return await loadWithoutSummary({
      processId: input.processId, source: current.source, sourceRevision: current.sourceRevision,
    }, dependencies);
    const summary = serializeProcessAiSummary(current.summary, current.source);
    return { ...state({ processId: input.processId, status: 'available', serverTime: currentTime(dependencies) }), summary };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ApplicationError') throw error;
    throw readFailure();
  }
}
