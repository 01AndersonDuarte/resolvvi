import type {
  Movement, Prisma, PrismaClient, ProcessAiSummary, SummaryAttempt, SummaryFeedbackRecord, SummaryGenerationSlot,
} from '../generated/prisma/client.js';
import { prepareSummarySource } from '../services/summary-source-service.js';
import type {
  PreparedSummarySource, SummaryReservation, SummaryReservationInput, SummarySourceSnapshot,
} from '../types/process-ai-summary.js';

type Transaction = Prisma.TransactionClient;
type SourceAndState = { source: PreparedSummarySource; sourceRevision: number; lastSummaryVersion: number };
type LatestSummary = Prisma.ProcessAiSummaryGetPayload<{ include: { slot: true } }>;
type LatestAttempt = Prisma.SummaryAttemptGetPayload<{ include: { slot: true } }>;

const TRANSACTION_TIMEOUT_MS = 2_000;
const LOCK_TIMEOUT = '250ms';
const SOURCE_BATCH_SIZE = 100;

async function lockProcess(transaction: Transaction, processId: number): Promise<boolean> {
  await transaction.$queryRaw`SELECT set_config('lock_timeout', ${LOCK_TIMEOUT}, true)`;
  await transaction.$executeRaw`LOCK TABLE "Movement" IN SHARE MODE`;
  const rows = await transaction.$queryRaw<{ id: number }[]>`
    SELECT "id" FROM "Process" WHERE "id" = ${processId} FOR UPDATE`;
  return rows.length === 1;
}

async function readMovements(transaction: Transaction, processId: number): Promise<Movement[]> {
  const movements: Movement[] = [];
  for (let offset = 0; ; offset += SOURCE_BATCH_SIZE) {
    const batch = await transaction.movement.findMany({
      where: { processId },
      orderBy: [{ movementDate: 'asc' }, { sourceOrder: 'asc' }, { id: 'asc' }],
      skip: offset,
      take: SOURCE_BATCH_SIZE,
    });
    movements.push(...batch);
    if (batch.length < SOURCE_BATCH_SIZE) return movements;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

async function observeSource(transaction: Transaction, processId: number): Promise<SourceAndState> {
  const source = await prepareSummarySource(processId, await readMovements(transaction, processId));
  const state = await transaction.summarySourceState.upsert({
    where: { processId },
    create: { processId, sourceHash: source.sourceHash, sourceRevision: 1 },
    update: {},
  });
  const updatedState = state.sourceHash === source.sourceHash
    ? state
    : await transaction.summarySourceState.update({
      where: { processId },
      data: { sourceHash: source.sourceHash, sourceRevision: { increment: 1 } },
    });
  return { source, sourceRevision: updatedState.sourceRevision, lastSummaryVersion: updatedState.lastSummaryVersion };
}

export async function observeProcessSummarySource(
  processId: number,
  client: PrismaClient,
): Promise<SummarySourceSnapshot | null> {
  return client.$transaction(async (transaction) => {
    if (!await lockProcess(transaction, processId)) return null;
    const source = await observeSource(transaction, processId);
    return source;
  }, { isolationLevel: 'ReadCommitted', timeout: TRANSACTION_TIMEOUT_MS, maxWait: TRANSACTION_TIMEOUT_MS });
}

export async function readCurrentProcessAiSummary(input: {
  processId: number;
  rulesVersion: string;
  userId?: string;
}, client: PrismaClient): Promise<(SourceAndState & {
  summary: (ProcessAiSummary & { feedback: SummaryFeedbackRecord[]; myFeedback: SummaryFeedbackRecord | null }) | null;
}) | null> {
  return client.$transaction(async (transaction) => {
    if (!await lockProcess(transaction, input.processId)) return null;
    const state = await observeSource(transaction, input.processId);
    const summary = await transaction.processAiSummary.findFirst({
      where: {
        processId: input.processId,
        version: state.lastSummaryVersion,
        slot: {
          sourceRevision: state.sourceRevision,
          sourceHash: state.source.sourceHash,
          rulesVersion: input.rulesVersion,
        },
      },
      include: { feedback: { where: { userId: input.userId ?? '00000000-0000-4000-8000-000000000000' } } },
    });
    return { ...state, summary: summary ? { ...summary, myFeedback: summary.feedback[0] ?? null } : null };
  }, { isolationLevel: 'ReadCommitted', timeout: TRANSACTION_TIMEOUT_MS, maxWait: TRANSACTION_TIMEOUT_MS });
}

export function findLatestProcessAiSummary(processId: number, client: PrismaClient): Promise<LatestSummary | null> {
  return client.processAiSummary.findFirst({
    where: { processId },
    orderBy: { version: 'desc' },
    include: { slot: true },
  });
}

export function findLatestProcessSummaryAttempt(input: {
  processId: number;
  sourceRevision: number;
  rulesVersion: string;
}, client: PrismaClient): Promise<LatestAttempt | null> {
  return client.summaryAttempt.findFirst({
    where: {
      slot: {
        processId: input.processId,
        sourceRevision: input.sourceRevision,
        rulesVersion: input.rulesVersion,
      },
    },
    orderBy: { number: 'desc' },
    include: { slot: true },
  });
}

export function findProcessSummaryAttempt(attemptId: string, processId: number, client: PrismaClient): Promise<LatestAttempt | null> {
  return client.summaryAttempt.findFirst({
    where: { id: attemptId, slot: { processId } },
    include: { slot: true },
  });
}

export async function reserveProcessSummaryAttempt(
  input: SummaryReservationInput,
  client: PrismaClient,
): Promise<SummaryReservation> {
  return client.$transaction(async (transaction) => {
    if (!await lockProcess(transaction, input.processId)) return emptyReservation('source_changed');
    const source = await observeSource(transaction, input.processId);
    if (source.source.eligibility !== 'eligible') return emptyReservation('source_changed');

    const slot = await findOrCreateSlot(transaction, input, source);
    const existing = await existingReservation(transaction, slot, input.now);
    if (existing) return existing;
    if (slot.retryAt && slot.retryAt > input.now) {
      return { ...emptyReservation('cooldown'), slotId: slot.id, retryAt: slot.retryAt };
    }
    return createAttempt({ transaction, slot, reservation: input, source: source.source });
  }, { isolationLevel: 'ReadCommitted', timeout: TRANSACTION_TIMEOUT_MS, maxWait: TRANSACTION_TIMEOUT_MS });
}

export async function publishProcessAiSummary(input: {
  processId: number;
  slotId: string;
  attemptId: string;
  rulesVersion: string;
  paragraphs: unknown;
  claims: unknown;
  now: Date;
  deadlineAt: Date;
  usage: { inputTokens: number; outputTokens: number } | null;
  providerRequestId: string | null;
}, client: PrismaClient): Promise<{ id: string; version: number } | null> {
  const remainingMs = input.deadlineAt.getTime() - input.now.getTime();
  if (remainingMs <= 0) return null;
  const transactionTimeout = Math.min(TRANSACTION_TIMEOUT_MS, remainingMs);
  return client.$transaction((transaction) => publishInTransaction(transaction, input), {
    isolationLevel: 'ReadCommitted', timeout: transactionTimeout, maxWait: transactionTimeout,
  });
}

async function publishInTransaction(
  transaction: Transaction,
  input: Parameters<typeof publishProcessAiSummary>[0],
): Promise<{ id: string; version: number } | null> {
  if (!await lockProcess(transaction, input.processId)) return null;
  const source = await observeSource(transaction, input.processId);
  const slot = await transaction.summaryGenerationSlot.findUnique({ where: { id: input.slotId } });
  const attempt = await transaction.summaryAttempt.findUnique({ where: { id: input.attemptId } });
  if (!slot || !attempt || slot.processId !== input.processId || slot.rulesVersion !== input.rulesVersion ||
    slot.sourceHash !== source.source.sourceHash || slot.sourceRevision !== source.sourceRevision ||
    attempt.slotId !== slot.id || attempt.status !== 'running' || attempt.deadlineAt <= input.now) return null;
  return createPublishedSummary(transaction, { input, slot, attempt, version: source.lastSummaryVersion + 1 });
}

async function createPublishedSummary(
  transaction: Transaction,
  publication: {
    input: Parameters<typeof publishProcessAiSummary>[0];
    slot: SummaryGenerationSlot;
    attempt: SummaryAttempt;
    version: number;
  },
): Promise<{ id: string; version: number }> {
  const { input, slot, attempt, version } = publication;
  const summary = await transaction.processAiSummary.create({
    data: {
      processId: input.processId, version, slotId: slot.id, attemptId: attempt.id,
      paragraphs: input.paragraphs as Prisma.InputJsonValue,
      claims: input.claims as Prisma.InputJsonValue,
      generatedAt: input.now,
    },
    select: { id: true, version: true },
  });
  const attemptData: Prisma.SummaryAttemptUpdateInput = { status: 'succeeded', finishedAt: input.now };
  if (input.usage) {
    attemptData.inputUnits = input.usage.inputTokens;
    attemptData.outputUnits = input.usage.outputTokens;
    attemptData.totalUnits = input.usage.inputTokens + input.usage.outputTokens;
  }
  if (input.providerRequestId) attemptData.providerRequestId = input.providerRequestId;
  await transaction.summaryAttempt.update({ where: { id: attempt.id }, data: attemptData });
  await transaction.summarySourceState.update({ where: { processId: input.processId }, data: { lastSummaryVersion: version } });
  return summary;
}

function emptyReservation(outcome: SummaryReservation['outcome']): SummaryReservation {
  return { outcome, slotId: null, attemptId: null, attemptNumber: null, deadlineAt: null, retryAt: null };
}

async function findOrCreateSlot(
  transaction: Transaction,
  input: SummaryReservationInput,
  source: SourceAndState,
): Promise<SummaryGenerationSlot> {
  const key = { processId_sourceRevision_rulesVersion: {
    processId: input.processId, sourceRevision: source.sourceRevision, rulesVersion: input.rulesVersion,
  } };
  return transaction.summaryGenerationSlot.upsert({
    where: key,
    create: {
      processId: input.processId,
      sourceRevision: source.sourceRevision,
      rulesVersion: input.rulesVersion,
      sourceHash: source.source.sourceHash,
      sourceFormatVersion: 'source-v1',
      sourceSnapshot: source.source.movements,
      movementCount: source.source.movements.length,
    },
    update: {},
  });
}

async function existingReservation(
  transaction: Transaction,
  slot: SummaryGenerationSlot,
  now: Date,
): Promise<SummaryReservation | null> {
  const summary = await transaction.processAiSummary.findUnique({ where: { slotId: slot.id } });
  if (summary) return { ...emptyReservation('reused'), slotId: slot.id };
  const attempt = await transaction.summaryAttempt.findFirst({
    where: { slotId: slot.id, status: 'running', deadlineAt: { gt: now } },
    orderBy: { number: 'desc' },
  });
  if (attempt) return reservationFromAttempt('joined', slot.id, attempt);
  await transaction.summaryAttempt.updateMany({
    where: { slotId: slot.id, status: 'running', deadlineAt: { lte: now } },
    data: { status: 'expired', failureCode: 'timeout', finishedAt: now },
  });
  return null;
}

async function createAttempt(input: {
  transaction: Transaction;
  slot: SummaryGenerationSlot;
  reservation: SummaryReservationInput;
  source: PreparedSummarySource;
}): Promise<SummaryReservation> {
  const { transaction, slot, reservation, source } = input;
  const number = slot.lastAttemptNumber + 1;
  await transaction.summaryGenerationSlot.update({
    where: { id: slot.id }, data: { lastAttemptNumber: number, retryAt: reservation.retryAt },
  });
  const attempt = await transaction.summaryAttempt.create({
    data: {
      slotId: slot.id, number, status: 'running', startedAt: reservation.now, deadlineAt: reservation.deadlineAt,
      configuration: reservation.configuration as Prisma.InputJsonValue,
      configurationHash: reservation.configurationHash,
    },
  });
  return { ...reservationFromAttempt('created', slot.id, attempt), source };
}

function reservationFromAttempt(
  outcome: 'created' | 'joined', slotId: string, attempt: SummaryAttempt,
): SummaryReservation {
  return {
    outcome, slotId, attemptId: attempt.id, attemptNumber: attempt.number,
    deadlineAt: attempt.deadlineAt, retryAt: null,
  };
}
