import type { Prisma, PrismaClient, SummaryFeedbackRecord } from '../generated/prisma/client.js';
import type { Movement } from '../generated/prisma/client.js';
import { prepareSummarySource } from '../services/summary-source-service.js';

const TRANSACTION_TIMEOUT_MS = 2_000;
const LOCK_TIMEOUT = '250ms';
const MOVEMENT_BATCH_SIZE = 100;

export type SaveSummaryFeedbackResult = {
  outcome: 'created' | 'updated' | 'unchanged';
  feedback: SummaryFeedbackRecord;
} | null;

export async function saveSummaryFeedback(input: {
  processId: number;
  summaryId: string;
  userId: string;
  rulesVersion: string;
  helpful: boolean;
  now: Date;
}, client: PrismaClient): Promise<SaveSummaryFeedbackResult> {
  return client.$transaction((transaction) => saveInTransaction(transaction, input), {
    isolationLevel: 'ReadCommitted', timeout: TRANSACTION_TIMEOUT_MS, maxWait: TRANSACTION_TIMEOUT_MS,
  });
}

async function saveInTransaction(
  transaction: Prisma.TransactionClient,
  input: Parameters<typeof saveSummaryFeedback>[0],
): Promise<SaveSummaryFeedbackResult> {
  if (!await lockProcess(transaction, input.processId)) return null;
  const state = await observeFeedbackSource(transaction, input.processId);
  if (!state) return null;
  const summary = await findCurrentSummary(transaction, input, state);
  if (!summary) return null;
  return persistFeedback(transaction, input);
}

async function lockProcess(
  transaction: Prisma.TransactionClient,
  processId: number,
): Promise<boolean> {
  await transaction.$queryRaw`SELECT set_config('lock_timeout', ${LOCK_TIMEOUT}, true)`;
  await transaction.$executeRaw`LOCK TABLE "Movement" IN SHARE MODE`;
  const locked = await transaction.$queryRaw<{ id: number }[]>`
    SELECT "id" FROM "Process" WHERE "id" = ${processId} FOR UPDATE`;
  return locked.length === 1;
}

async function observeFeedbackSource(
  transaction: Prisma.TransactionClient,
  processId: number,
): Promise<{ sourceHash: string; sourceRevision: number; lastSummaryVersion: number } | null> {
  const movements = await readMovements(transaction, processId);
  const source = await prepareSummarySource(processId, movements);
  const previous = await transaction.summarySourceState.findUnique({ where: { processId } });
  if (!previous) return null;
  if (source.sourceHash === previous.sourceHash) return previous;
  return transaction.summarySourceState.update({
    where: { processId }, data: { sourceHash: source.sourceHash, sourceRevision: { increment: 1 } },
  });
}

async function readMovements(transaction: Prisma.TransactionClient, processId: number): Promise<Movement[]> {
  const movements: Movement[] = [];
  for (let offset = 0; ; offset += MOVEMENT_BATCH_SIZE) {
    const batch = await transaction.movement.findMany({
      where: { processId },
      orderBy: [{ movementDate: 'asc' }, { sourceOrder: 'asc' }, { id: 'asc' }],
      skip: offset,
      take: MOVEMENT_BATCH_SIZE,
    });
    movements.push(...batch);
    if (batch.length < MOVEMENT_BATCH_SIZE) return movements;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

async function findCurrentSummary(
  transaction: Prisma.TransactionClient,
  input: Parameters<typeof saveSummaryFeedback>[0],
  state: { sourceHash: string; sourceRevision: number; lastSummaryVersion: number },
): Promise<boolean> {
  const summary = await transaction.processAiSummary.findFirst({
    where: {
      id: input.summaryId, processId: input.processId, version: state.lastSummaryVersion,
      slot: { sourceRevision: state.sourceRevision, sourceHash: state.sourceHash, rulesVersion: input.rulesVersion },
    },
    select: { id: true },
  });
  return summary !== null;
}

async function persistFeedback(
  transaction: Prisma.TransactionClient,
  input: Parameters<typeof saveSummaryFeedback>[0],
): Promise<SaveSummaryFeedbackResult> {
  const key = { summaryId_userId: { summaryId: input.summaryId, userId: input.userId } };
  const existing = await transaction.summaryFeedbackRecord.findUnique({ where: key });
  if (existing?.helpful === input.helpful) return { outcome: 'unchanged', feedback: existing };
  if (existing) {
    const feedback = await transaction.summaryFeedbackRecord.update({ where: key, data: { helpful: input.helpful, updatedAt: input.now } });
    return { outcome: 'updated', feedback };
  }
  const feedback = await transaction.summaryFeedbackRecord.create({
    data: { summaryId: input.summaryId, userId: input.userId, helpful: input.helpful, createdAt: input.now, updatedAt: input.now },
  });
  return { outcome: 'created', feedback };
}
