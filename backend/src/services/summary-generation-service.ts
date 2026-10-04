import type { PreparedSummarySource } from '../types/process-ai-summary.js';
import type { SummaryProvider, SummaryProviderInput, SummaryProviderResult, ValidatedSummary } from '../types/summary-provider.js';
import { SummaryProviderError } from '../types/summary-provider.js';
import { ProcessAiSummaryError } from '../errors/process-ai-summary-errors.js';
import { logSummaryOperationalEvent, type SummaryOperationalEvent } from './summary-operational-event-service.js';

const MAX_LOCAL_EXECUTIONS = 4;
const TOTAL_DEADLINE_MS = 30_000;
const PROVIDER_DEADLINE_MS = 25_000;
const VALIDATION_DEADLINE_MS = 27_000;
const PUBLICATION_DEADLINE_MS = 29_000;
const MINIMUM_RETRY_DELAY_MS = 30_000;

export type SummaryGenerationJob = {
  processId: number;
  slotId: string;
  attemptId: string;
  sessionId: string;
  rulesVersion: string;
  source: PreparedSummarySource;
  requestedAt: number;
  startedAt: Date;
};

type SummaryAttemptFailure = {
  attemptId: string;
  failureCode: string;
  retryAt: Date | null;
  now: Date;
  usage?: SummaryProviderResult['usage'];
  providerRequestId?: string | null;
};

export type SummaryGenerationDependencies = {
  provider: SummaryProvider | null;
  validateSession: (sessionId: string) => Promise<void>;
  markDispatched: (attemptId: string, now: Date) => Promise<boolean>;
  validateOutput: (result: SummaryProviderResult, source: PreparedSummarySource) => ValidatedSummary;
  publish: (input: {
    processId: number;
    slotId: string;
    attemptId: string;
    rulesVersion: string;
    paragraphs: string[];
    claims: ValidatedSummary['output']['paragraphs'];
    now: Date;
    deadlineAt: Date;
    usage: SummaryProviderResult['usage'];
    providerRequestId: string | null;
  }) => Promise<boolean>;
  finish: (input: SummaryAttemptFailure) => Promise<void>;
  createProviderInput: (source: PreparedSummarySource, signal: AbortSignal) => SummaryProviderInput;
  now?: () => Date;
  monotonicNow?: () => number;
  onEvent?: (event: SummaryOperationalEvent) => void;
};

export type SummaryGenerationService = {
  acquire: () => (() => void) | null;
  start: (job: SummaryGenerationJob, release?: () => void) => boolean;
  shutdown: () => Promise<void>;
};

type ActiveExecution = { controller: AbortController; operation: Promise<void> };

function currentDate(dependencies: SummaryGenerationDependencies): Date {
  return dependencies.now?.() ?? new Date();
}

function monotonicTime(dependencies: SummaryGenerationDependencies): number {
  return dependencies.monotonicNow?.() ?? performance.now();
}

function emitEvent(dependencies: SummaryGenerationDependencies, event: SummaryOperationalEvent): void {
  (dependencies.onEvent ?? logSummaryOperationalEvent)(event);
}

function failureCode(error: unknown): string {
  if (error instanceof ProcessAiSummaryError) {
    return error.code === 'SUMMARY_OUTPUT_INVALID' || error.code === 'SUMMARY_OUTPUT_LANGUAGE_INVALID'
      ? 'INVALID_OUTPUT'
      : 'GENERATION_ERROR';
  }
  if (error instanceof SummaryProviderError) {
    if (error.code === 'rate_limited') return 'PROVIDER_RATE_LIMIT';
    if (error.code === 'unavailable') return 'PROVIDER_UNAVAILABLE';
    if (error.code === 'invalid_response') return 'INVALID_OUTPUT';
  }
  return 'GENERATION_ERROR';
}

function retryAt(error: unknown, now: Date, startedAt: Date): Date | null {
  if (!(error instanceof SummaryProviderError)) return null;
  const delay = error.retryAfterMs ?? MINIMUM_RETRY_DELAY_MS;
  return new Date(Math.max(startedAt.getTime() + MINIMUM_RETRY_DELAY_MS, now.getTime() + delay));
}

function isDeadlineExceeded(job: SummaryGenerationJob, dependencies: SummaryGenerationDependencies, budget: number): boolean {
  return monotonicTime(dependencies) - job.requestedAt >= budget;
}

async function finishFailure(
  job: SummaryGenerationJob,
  dependencies: SummaryGenerationDependencies,
  failure: { code: string; providerResult?: SummaryProviderResult; retryAt?: Date | null },
): Promise<void> {
  const command: SummaryAttemptFailure = {
    attemptId: job.attemptId,
    failureCode: failure.code,
    retryAt: failure.retryAt ?? null,
    now: currentDate(dependencies),
  };
  if (failure.providerResult?.usage !== undefined) command.usage = failure.providerResult.usage;
  if (failure.providerResult?.providerRequestId !== undefined) command.providerRequestId = failure.providerResult.providerRequestId;
  await dependencies.finish(command);
}

async function dispatchAndGenerate(
  job: SummaryGenerationJob,
  dependencies: SummaryGenerationDependencies,
  controller: AbortController,
): Promise<SummaryProviderResult | null> {
  await dependencies.validateSession(job.sessionId);
  if (isDeadlineExceeded(job, dependencies, PROVIDER_DEADLINE_MS)) {
    await finishFailure(job, dependencies, { code: 'GENERATION_TIMEOUT' });
    return null;
  }
  const dispatched = await dependencies.markDispatched(job.attemptId, currentDate(dependencies));
  if (!dispatched) {
    await finishFailure(job, dependencies, { code: 'GENERATION_TIMEOUT' });
    return null;
  }
  emitEvent(dependencies, { event: 'summary_call_dispatched', processId: job.processId, slotId: job.slotId, attemptId: job.attemptId, rulesVersion: job.rulesVersion });
  if (!dependencies.provider) throw new SummaryProviderError('unavailable', MINIMUM_RETRY_DELAY_MS);
  return dependencies.provider.generate(dependencies.createProviderInput(job.source, controller.signal));
}

async function executeJob(
  job: SummaryGenerationJob,
  dependencies: SummaryGenerationDependencies,
  controller: AbortController,
): Promise<void> {
  const providerTimeout = Math.max(0, PROVIDER_DEADLINE_MS - (monotonicTime(dependencies) - job.requestedAt));
  const providerTimer = setTimeout(() => controller.abort(), providerTimeout);
  let providerResult: SummaryProviderResult | undefined;
  try {
    const receivedResult = await dispatchAndGenerate(job, dependencies, controller);
    if (!receivedResult) return;
    providerResult = receivedResult;
    emitProviderResponse(job, dependencies, receivedResult);
    await validateAndPublish({ job, dependencies, controller, providerResult: receivedResult });
  } catch (error: unknown) {
    await handleGenerationError({ job, dependencies, controller, error, providerResult });
  } finally {
    clearTimeout(providerTimer);
  }
}

function emitProviderResponse(job: SummaryGenerationJob, dependencies: SummaryGenerationDependencies, result: SummaryProviderResult): void {
  emitEvent(dependencies, {
    event: 'summary_call_responded', processId: job.processId, slotId: job.slotId,
    attemptId: job.attemptId, rulesVersion: job.rulesVersion,
    inputUnits: result.usage?.inputTokens ?? null, outputUnits: result.usage?.outputTokens ?? null,
    totalUnits: result.usage ? result.usage.inputTokens + result.usage.outputTokens : null,
    unit: 'tokens', result: result.status,
  });
}

async function handleGenerationError(input: {
  job: SummaryGenerationJob;
  dependencies: SummaryGenerationDependencies;
  controller: AbortController;
  error: unknown;
  providerResult?: SummaryProviderResult | undefined;
}): Promise<void> {
  const { job, dependencies, controller, error } = input;
  const code = controller.signal.aborted ? 'GENERATION_TIMEOUT' : failureCode(error);
  const finishedAt = currentDate(dependencies);
  const failure: { code: string; retryAt: Date | null; providerResult?: SummaryProviderResult } = {
    code, retryAt: retryAt(error, finishedAt, job.startedAt),
  };
  if (input.providerResult) failure.providerResult = input.providerResult;
  await finishFailure(job, dependencies, failure);
  emitEvent(dependencies, {
    event: code === 'GENERATION_TIMEOUT' ? 'summary_expired' : 'summary_failed',
    processId: job.processId, slotId: job.slotId, attemptId: job.attemptId,
    rulesVersion: job.rulesVersion, failureCode: code,
    durationMs: Math.round(monotonicTime(dependencies) - job.requestedAt),
    inputUnits: input.providerResult?.usage?.inputTokens ?? null,
    outputUnits: input.providerResult?.usage?.outputTokens ?? null,
    totalUnits: input.providerResult?.usage
      ? input.providerResult.usage.inputTokens + input.providerResult.usage.outputTokens
      : null,
    unit: 'tokens',
  });
}

async function validateAndPublish(input: {
  job: SummaryGenerationJob;
  dependencies: SummaryGenerationDependencies;
  controller: AbortController;
  providerResult: SummaryProviderResult;
}): Promise<void> {
  const { job, dependencies, controller, providerResult } = input;
  if (controller.signal.aborted || isDeadlineExceeded(job, dependencies, PROVIDER_DEADLINE_MS)) {
    await finishFailure(job, dependencies, { code: 'GENERATION_TIMEOUT', providerResult });
    return;
  }
  const validated = dependencies.validateOutput(providerResult, job.source);
  if (isDeadlineExceeded(job, dependencies, VALIDATION_DEADLINE_MS)) {
    await finishFailure(job, dependencies, { code: 'GENERATION_TIMEOUT', providerResult });
    return;
  }
  await publishValidated({ job, dependencies, validated, providerResult });
}

async function publishValidated(input: {
  job: SummaryGenerationJob;
  dependencies: SummaryGenerationDependencies;
  validated: ValidatedSummary;
  providerResult: SummaryProviderResult;
}): Promise<void> {
  const { job, dependencies, validated, providerResult } = input;
  if (isDeadlineExceeded(job, dependencies, PUBLICATION_DEADLINE_MS)) {
    await finishFailure(job, dependencies, { code: 'GENERATION_TIMEOUT', providerResult });
    return;
  }
  const published = await dependencies.publish(createPublicationInput({ job, dependencies, validated, providerResult }));
  if (!published) await finishFailure(job, dependencies, { code: 'SOURCE_CHANGED', providerResult });
  else emitCompletion(job, dependencies, providerResult);
}

function createPublicationInput(input: {
  job: SummaryGenerationJob;
  dependencies: SummaryGenerationDependencies;
  validated: ValidatedSummary;
  providerResult: SummaryProviderResult;
}): Parameters<SummaryGenerationDependencies['publish']>[0] {
  const { job, dependencies, validated, providerResult } = input;
  return {
    processId: job.processId,
    slotId: job.slotId,
    attemptId: job.attemptId,
    rulesVersion: job.rulesVersion,
    paragraphs: validated.output.paragraphs.map((paragraph) => paragraph.sentences.map((sentence) => sentence.text).join(' ')),
    claims: validated.output.paragraphs,
    now: currentDate(dependencies),
    deadlineAt: new Date(job.startedAt.getTime() + TOTAL_DEADLINE_MS),
    usage: providerResult.usage,
    providerRequestId: providerResult.providerRequestId ?? null,
  };
}

function emitCompletion(job: SummaryGenerationJob, dependencies: SummaryGenerationDependencies, result: SummaryProviderResult): void {
  emitEvent(dependencies, {
    event: 'summary_completed', processId: job.processId, slotId: job.slotId, attemptId: job.attemptId,
    rulesVersion: job.rulesVersion, durationMs: Math.round(monotonicTime(dependencies) - job.requestedAt),
    inputUnits: result.usage?.inputTokens ?? null, outputUnits: result.usage?.outputTokens ?? null,
    totalUnits: result.usage ? result.usage.inputTokens + result.usage.outputTokens : null,
    unit: 'tokens',
  });
}

export function createSummaryGenerationService(dependencies: SummaryGenerationDependencies): SummaryGenerationService {
  const active = new Set<ActiveExecution>();
  let closing = false;
  let reservedCapacity = 0;

  function acquireCapacity(): (() => void) | null {
    if (closing || reservedCapacity >= MAX_LOCAL_EXECUTIONS) return null;
    reservedCapacity += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      reservedCapacity -= 1;
    };
  }

  return {
    acquire: acquireCapacity,
    start: (job, release) => startJob({ job, dependencies, active, isClosing: () => closing, acquireCapacity, release }),
    shutdown: async () => {
      closing = true;
      active.forEach((execution) => execution.controller.abort());
      await Promise.allSettled([...active].map((execution) => execution.operation));
    },
  };
}

function startJob(input: {
  job: SummaryGenerationJob;
  dependencies: SummaryGenerationDependencies;
  active: Set<ActiveExecution>;
  isClosing: () => boolean;
  acquireCapacity: () => (() => void) | null;
  release: (() => void) | undefined;
}): boolean {
  const { job, dependencies, active, isClosing } = input;
  const release = input.release ?? input.acquireCapacity();
  if (!release) return false;
  if (isClosing() || isDeadlineExceeded(job, dependencies, TOTAL_DEADLINE_MS)) {
    release();
    return false;
  }
  const controller = new AbortController();
  const execution = { controller, operation: Promise.resolve() };
  execution.operation = Promise.resolve().then(() => executeJob(job, dependencies, controller)).catch(() => {
    emitEvent(dependencies, { event: 'summary_failed', processId: job.processId, slotId: job.slotId, attemptId: job.attemptId, failureCode: 'PERSISTENCE_FAILED' });
  }).finally(() => {
    active.delete(execution);
    release();
  });
  active.add(execution);
  return true;
}
