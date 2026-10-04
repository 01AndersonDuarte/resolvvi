import { randomUUID } from 'node:crypto';

import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import type { AuthenticationDatabase } from '../protocols.js';
import type { EmissionReservation } from './verification-repository.js';
import { getEmissionRetryAfter } from './verification-rate-limit.js';

const WINDOW_MS = 60 * 60 * 1000;
const EXPIRATION_MS = 24 * 60 * 60 * 1000;

export function createEmissionReserver(client: AuthenticationDatabase) {
  return async (input: { userId: string; tokenHash: string }): Promise<EmissionReservation> => {
    if (!('$transaction' in client)) throw new Error('Serializable reservation requires PrismaClient.');
    return reserveWithRetry(client as PrismaClient, input, 0);
  };
}

async function reserveWithRetry(
  client: PrismaClient,
  input: { userId: string; tokenHash: string },
  attempt: number,
): Promise<EmissionReservation> {
  try {
    return await client.$transaction(
      (transaction) => reserveInTransaction(transaction, input),
      { isolationLevel: 'Serializable', maxWait: 2_000, timeout: 3_000 },
    );
  } catch (error: unknown) {
    if (isSerializationConflict(error) && attempt < 2) return reserveWithRetry(client, input, attempt + 1);
    throw error;
  }
}

async function reserveInTransaction(
  transaction: Prisma.TransactionClient,
  input: { userId: string; tokenHash: string },
): Promise<EmissionReservation> {
  const [{ now } = {}] = await transaction.$queryRaw<{ now: Date }[]>`SELECT CURRENT_TIMESTAMP AS now`;
  if (!(now instanceof Date)) throw new Error('Database clock is unavailable.');
  const user = await transaction.user.findUnique({ where: { id: input.userId } });
  if (!user || user.emailVerifiedAt) return { status: 'confirmed' };

  const emissions = await listRecentEmissions(transaction, input.userId, now);
  const retryAfterSeconds = getEmissionRetryAfter(emissions, now);
  if (retryAfterSeconds > 0) return { status: 'limited', retryAfterSeconds };
  return createReservedEmission(transaction, input, now);
}

async function listRecentEmissions(
  transaction: Prisma.TransactionClient,
  userId: string,
  now: Date,
): Promise<{ issuedAt: Date }[]> {
  return transaction.emailVerification.findMany({
    where: { userId, issuedAt: { gt: new Date(now.getTime() - WINDOW_MS), lte: now } },
    orderBy: { issuedAt: 'asc' },
    select: { issuedAt: true },
  });
}

async function createReservedEmission(
  transaction: Prisma.TransactionClient,
  input: { userId: string; tokenHash: string },
  now: Date,
): Promise<EmissionReservation> {
  await transaction.emailVerification.updateMany({
    where: { userId: input.userId, consumedAt: null, invalidatedAt: null },
    data: { invalidatedAt: now },
  });
  const emission = await transaction.emailVerification.create({
    data: {
      id: randomUUID(), userId: input.userId, tokenHash: input.tokenHash,
      issuedAt: now, expiresAt: new Date(now.getTime() + EXPIRATION_MS),
    },
  });
  return { status: 'reserved', emission };
}

function isSerializationConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034';
}
