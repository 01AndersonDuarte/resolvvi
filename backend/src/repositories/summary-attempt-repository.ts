import type { Prisma, PrismaClient, SummaryAttempt, SummaryAttemptStatus } from '../generated/prisma/client.js';

const TERMINAL_STATUSES: SummaryAttemptStatus[] = ['failed', 'expired', 'source_changed', 'rules_changed'];

export async function markSummaryAttemptDispatched(
  attemptId: string,
  now: Date,
  client: PrismaClient,
): Promise<boolean> {
  const result = await client.summaryAttempt.updateMany({
    where: { id: attemptId, status: 'running', callStartedAt: null, deadlineAt: { gt: now } },
    data: { callStartedAt: now },
  });
  return result.count === 1;
}

export async function finishSummaryAttempt(input: {
  attemptId: string;
  status: 'failed' | 'expired' | 'source_changed' | 'rules_changed';
  failureCode: string | null;
  finishedAt: Date;
  usage?: { inputTokens: number; outputTokens: number } | null;
  providerRequestId?: string | null;
  retryAt?: Date | null;
}, client: PrismaClient): Promise<boolean> {
  const data: Prisma.SummaryAttemptUpdateManyMutationInput = {
    status: input.status,
    failureCode: input.failureCode,
    finishedAt: input.finishedAt,
  };
  if (input.usage) {
    data.inputUnits = input.usage.inputTokens;
    data.outputUnits = input.usage.outputTokens;
    data.totalUnits = input.usage.inputTokens + input.usage.outputTokens;
  }
  if (input.providerRequestId) data.providerRequestId = input.providerRequestId;
  return client.$transaction((transaction) => finishInTransaction(transaction, { input, data }), {
    isolationLevel: 'ReadCommitted', timeout: 2_000, maxWait: 2_000,
  });
}

async function finishInTransaction(
  transaction: Prisma.TransactionClient,
  command: { input: Parameters<typeof finishSummaryAttempt>[0]; data: Prisma.SummaryAttemptUpdateManyMutationInput },
): Promise<boolean> {
  const attempt = await transaction.summaryAttempt.findUnique({ where: { id: command.input.attemptId }, select: { slotId: true } });
  if (!attempt) return false;
  await transaction.$queryRaw`SELECT "id" FROM "SummaryGenerationSlot" WHERE "id" = ${attempt.slotId} FOR UPDATE`;
  const updated = await transaction.summaryAttempt.updateMany({
    where: { id: command.input.attemptId, status: 'running' }, data: command.data,
  });
  if (updated.count !== 1 || !command.input.retryAt) return updated.count === 1;
  await transaction.summaryGenerationSlot.update({ where: { id: attempt.slotId }, data: { retryAt: command.input.retryAt } });
  return true;
}

export async function expireOverdueSummaryAttempt(
  attemptId: string,
  now: Date,
  client: PrismaClient,
): Promise<boolean> {
  const result = await client.summaryAttempt.updateMany({
    where: { id: attemptId, status: 'running', deadlineAt: { lte: now } },
    data: { status: 'expired', failureCode: 'timeout', finishedAt: now },
  });
  return result.count === 1;
}

export function findSummaryAttempt(attemptId: string, client: PrismaClient): Promise<SummaryAttempt | null> {
  return client.summaryAttempt.findUnique({ where: { id: attemptId } });
}

export function isSummaryAttemptTerminal(status: SummaryAttemptStatus): boolean {
  return TERMINAL_STATUSES.includes(status) || status === 'succeeded';
}
