import type { PrismaClient } from '../generated/prisma/client.js';
import { summaryApplicationError } from '../errors/process-ai-summary-errors.js';
import { reserveProcessSummaryAttempt } from '../repositories/process-ai-summary-repository.js';
import { finishSummaryAttempt } from '../repositories/summary-attempt-repository.js';
import type { AiSummaryState, ProcessAiSummaryServiceContract, SummaryFeedbackCommand } from '../types/process-ai-summary.js';
import type { SummaryEnvironment } from '../types/config.js';
import type { SummaryProvider } from '../types/summary-provider.js';
import { SUMMARY_OUTPUT_TOKEN_LIMIT, SUMMARY_RULES_VERSION } from './summary-prompt-service.js';
import type { SummaryGenerationService } from './summary-generation-service.js';
import { saveProcessAiSummaryFeedback } from './process-ai-summary-feedback-service.js';
import { loadProcessAiSummaryState, type SummaryReadInput } from './process-ai-summary-state-service.js';
import { logSummaryOperationalEvent } from './summary-operational-event-service.js';
import { ApplicationError } from '../errors/application-error.js';

const TOTAL_ATTEMPT_MS = 30_000;
const MINIMUM_COOLDOWN_MS = 30_000;

export type ProcessAiSummaryServiceDependencies = {
  client: PrismaClient;
  configuration: SummaryEnvironment;
  provider: SummaryProvider | null;
  generation: SummaryGenerationService;
  now?: () => Date;
  monotonicNow?: () => number;
};
export type ProcessAiSummaryService = ProcessAiSummaryServiceContract;

function currentTime(dependencies: ProcessAiSummaryServiceDependencies): Date {
  return dependencies.now?.() ?? new Date();
}

function monotonicTime(dependencies: ProcessAiSummaryServiceDependencies): number {
  return dependencies.monotonicNow?.() ?? performance.now();
}

function summarySaveFailure(): Error {
  return summaryApplicationError({ code: 'SUMMARY_SAVE_FAILED', message: 'Não foi possível iniciar a geração do resumo', status: 503 });
}

function stateFromReservation(input: {
  processId: number;
  reservation: Awaited<ReturnType<typeof reserveProcessSummaryAttempt>>;
  now: Date;
}): AiSummaryState {
  if (!input.reservation.attemptId || !input.reservation.deadlineAt) {
    return {
      processId: input.processId, status: 'generating', summary: null, attempt: null,
      message: 'Gerando resumo…', failureCode: null, action: 'none', serverTime: input.now.toISOString(),
    };
  }
  return {
    processId: input.processId,
    status: 'generating',
    summary: null,
    attempt: {
      id: input.reservation.attemptId,
      startedAt: input.now.toISOString(),
      deadlineAt: input.reservation.deadlineAt.toISOString(),
      retryAt: input.reservation.retryAt?.toISOString() ?? null,
    },
    message: 'Gerando resumo…',
    failureCode: null,
    action: 'none',
    serverTime: input.now.toISOString(),
  };
}

function throwRetryTooSoon(retryAt: Date, now: Date): never {
  const seconds = Math.max(1, Math.ceil((retryAt.getTime() - now.getTime()) / 1_000));
  throw summaryApplicationError({
    code: 'SUMMARY_RETRY_TOO_SOON',
    message: 'Aguarde para tentar gerar o resumo novamente',
    status: 429,
    retryAfterSeconds: seconds,
  });
}

function persistedProviderConfiguration(dependencies: ProcessAiSummaryServiceDependencies): Record<string, unknown> {
  return {
    provider: dependencies.provider?.configuration.provider ?? 'openai',
    model: dependencies.provider?.configuration.model ?? dependencies.configuration.model,
    rulesVersion: SUMMARY_RULES_VERSION,
    contextCapacity: dependencies.configuration.contextCapacity,
    outputLimit: SUMMARY_OUTPUT_TOKEN_LIMIT,
    estimatorVersion: 'utf8-upper-bound-v1',
    temperature: 0,
    store: false,
  };
}

async function createAttemptReservation(input: {
  processId: number;
  startedAt: Date;
}, dependencies: ProcessAiSummaryServiceDependencies): Promise<{
  reservation: Awaited<ReturnType<typeof reserveProcessSummaryAttempt>>;
  now: Date;
}> {
  const now = currentTime(dependencies);
  const reservation = await reserveProcessSummaryAttempt({
    processId: input.processId,
    rulesVersion: SUMMARY_RULES_VERSION,
    configuration: persistedProviderConfiguration(dependencies),
    configurationHash: dependencies.provider?.configuration.configurationHash ?? '0'.repeat(64),
    now,
    deadlineAt: new Date(input.startedAt.getTime() + TOTAL_ATTEMPT_MS),
    retryAt: new Date(input.startedAt.getTime() + MINIMUM_COOLDOWN_MS),
  }, dependencies.client);
  return { reservation, now };
}

async function failReservedJob(
  attemptId: string,
  dependencies: ProcessAiSummaryServiceDependencies,
): Promise<never> {
  await finishSummaryAttempt({ attemptId, status: 'expired', failureCode: 'timeout', finishedAt: currentTime(dependencies) }, dependencies.client);
  throw summaryApplicationError({
    code: 'SUMMARY_CAPACITY_EXCEEDED', message: 'A geração está ocupada.', status: 503, retryAfterSeconds: 30,
  });
}

async function startReservedJob(input: {
  request: SummaryReadInput & { sessionId: string };
  reservation: Awaited<ReturnType<typeof reserveProcessSummaryAttempt>>;
  now: Date;
  requestedAt: number;
  startedAt: Date;
  release: () => void;
}, dependencies: ProcessAiSummaryServiceDependencies): Promise<AiSummaryState> {
  const { request, reservation, now, requestedAt, startedAt, release } = input;
  if (!reservation.slotId || !reservation.attemptId || !reservation.source) {
    release();
    throw summarySaveFailure();
  }
  const started = dependencies.generation.start({
    processId: request.processId,
    slotId: reservation.slotId,
    attemptId: reservation.attemptId,
    sessionId: request.sessionId,
    rulesVersion: SUMMARY_RULES_VERSION,
    source: reservation.source,
    requestedAt,
    startedAt,
  }, release);
  if (!started) return failReservedJob(reservation.attemptId, dependencies);
  return stateFromReservation({ processId: request.processId, reservation, now });
}

async function reserveAndSchedule(input: {
  request: SummaryReadInput & { sessionId: string };
  requestedAt: number;
  startedAt: Date;
}, dependencies: ProcessAiSummaryServiceDependencies): Promise<AiSummaryState> {
  const release = dependencies.generation.acquire();
  if (!release) throw summaryApplicationError({
    code: 'SUMMARY_CAPACITY_EXCEEDED', message: 'A geração está ocupada. Tente novamente em instantes.',
    status: 503, retryAfterSeconds: 30,
  });
  let reserved: Awaited<ReturnType<typeof createAttemptReservation>>;
  try {
    reserved = await createAttemptReservation({ processId: input.request.processId, startedAt: input.startedAt }, dependencies);
  } catch {
    release();
    throw summarySaveFailure();
  }
  const { reservation, now } = reserved;
  if (reservation.outcome !== 'created') {
    release();
    if (reservation.outcome === 'cooldown' && reservation.retryAt) throwRetryTooSoon(reservation.retryAt, now);
    return loadProcessAiSummaryState(input.request, dependencies);
  }
  return startReservedJob({ ...input, reservation, now, release }, dependencies);
}

async function requestGeneration(
  input: SummaryReadInput & { sessionId: string },
  dependencies: ProcessAiSummaryServiceDependencies,
): Promise<AiSummaryState> {
  const requestedAt = monotonicTime(dependencies);
  const startedAt = currentTime(dependencies);
  const current = await loadProcessAiSummaryState(input, dependencies);
  logSummaryOperationalEvent({ event: 'summary_requested', requestId: input.requestId, processId: input.processId, rulesVersion: SUMMARY_RULES_VERSION });
  if (current.status === 'available' || current.status === 'generating') return returnExistingState(input, current);
  if (['no_movements', 'insufficient_data', 'context_exceeded'].includes(current.status)) {
    throw summaryApplicationError({
      code: 'SUMMARY_NOT_ELIGIBLE', message: current.message ?? 'O histórico não está elegível para geração.', status: 422,
    });
  }
  if (current.attempt?.retryAt && new Date(current.attempt.retryAt) > startedAt) {
    throwRetryTooSoon(new Date(current.attempt.retryAt), startedAt);
  }
  if (!dependencies.configuration.enabled || !dependencies.provider) {
    throw summaryApplicationError({
      code: 'SERVICE_UNAVAILABLE', message: 'A geração de resumos está temporariamente indisponível.', status: 503,
    });
  }
  return reserveAndSchedule({ request: input, requestedAt, startedAt }, dependencies);
}

function returnExistingState(input: SummaryReadInput, current: AiSummaryState): AiSummaryState {
  logSummaryOperationalEvent({
    event: current.status === 'available' ? 'summary_reused' : 'summary_joined',
    requestId: input.requestId, processId: input.processId, summaryId: current.summary?.id,
    attemptId: current.attempt?.id, rulesVersion: SUMMARY_RULES_VERSION,
  });
  return current;
}

async function requestWithLogging(
  input: SummaryReadInput & { sessionId: string },
  dependencies: ProcessAiSummaryServiceDependencies,
): Promise<AiSummaryState> {
  try {
    return await requestGeneration(input, dependencies);
  } catch (error: unknown) {
    logSummaryOperationalEvent({
      event: 'summary_rejected', requestId: input.requestId, processId: input.processId,
      rulesVersion: SUMMARY_RULES_VERSION,
      failureCode: error instanceof ApplicationError ? error.code : 'GENERATION_ERROR',
    });
    throw error;
  }
}

export function createProcessAiSummaryService(dependencies: ProcessAiSummaryServiceDependencies): ProcessAiSummaryService {
  return {
    read: async (input) => {
      const result = await loadProcessAiSummaryState(input, dependencies);
      if (result.status === 'available' && input.track !== false) {
        logSummaryOperationalEvent({
          event: 'summary_reused', requestId: input.requestId, processId: input.processId,
          summaryId: result.summary?.id, rulesVersion: SUMMARY_RULES_VERSION, result: 'read',
        });
      }
      if (result.status === 'stale' && input.track !== false) {
        logSummaryOperationalEvent({ event: 'summary_invalidated', requestId: input.requestId, processId: input.processId, rulesVersion: SUMMARY_RULES_VERSION });
      }
      return result;
    },
    requestGeneration: (input) => requestWithLogging(input, dependencies),
    saveFeedback: (input: SummaryFeedbackCommand) => saveProcessAiSummaryFeedback(input, dependencies),
  };
}
