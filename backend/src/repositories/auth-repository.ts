import { randomUUID } from 'node:crypto';

import type { EmailVerification, Prisma, PrismaClient, Session, User } from '../generated/prisma/client.js';
import type { AuthRepository, CreateSessionInput, CreateUserInput, CreateVerificationInput, EmissionReservation, VerificationEmission } from '../types/auth.js';
import type { AuthenticationDatabase } from '../types/database.js';

const WINDOW_MS = 60 * 60 * 1000;
const MINIMUM_INTERVAL_MS = 60 * 1000;
const MAX_WINDOW_EMISSIONS = 5;
const VERIFICATION_EXPIRATION_MS = 24 * 60 * 60 * 1000;
const MAX_SERIALIZATION_RETRIES = 2;

export function createUser(input: CreateUserInput, client: AuthenticationDatabase): Promise<User> {
  return client.user.create({ data: input });
}

export function findUserByEmail(email: string, client: AuthenticationDatabase): Promise<User | null> {
  return client.user.findUnique({ where: { email } });
}

export function findUserById(id: string, client: AuthenticationDatabase): Promise<User | null> {
  return client.user.findUnique({ where: { id } });
}

export function markEmailVerified(id: string, verifiedAt: Date, client: AuthenticationDatabase): Promise<User> {
  return client.user.update({ where: { id }, data: { emailVerifiedAt: verifiedAt } });
}

export function createSession(input: CreateSessionInput, client: AuthenticationDatabase): Promise<Session> {
  return client.session.create({ data: input });
}

export function findSessionByTokenHash(tokenHash: string, client: AuthenticationDatabase): Promise<Session | null> {
  return client.session.findUnique({ where: { tokenHash } });
}

export async function revokeSessionByTokenHash(
  tokenHash: string,
  revokedAt: Date,
  client: AuthenticationDatabase,
): Promise<number> {
  const result = await client.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt },
  });
  return result.count;
}

export function createVerification(
  input: CreateVerificationInput,
  client: AuthenticationDatabase,
): Promise<EmailVerification> {
  return client.emailVerification.create({ data: input });
}

export function findVerificationByTokenHash(
  tokenHash: string,
  client: AuthenticationDatabase,
): Promise<EmailVerification | null> {
  return client.emailVerification.findUnique({ where: { tokenHash } });
}

export async function invalidateActiveVerifications(
  userId: string,
  invalidatedAt: Date,
  client: AuthenticationDatabase,
): Promise<number> {
  const result = await client.emailVerification.updateMany({
    where: { userId, consumedAt: null, invalidatedAt: null },
    data: { invalidatedAt },
  });
  return result.count;
}

export function updateVerificationDelivery(
  input: { id: string; status: 'ACCEPTED' | 'FAILED'; providerMessageId: string | null },
  client: AuthenticationDatabase,
): Promise<EmailVerification> {
  return client.emailVerification.update({
    where: { id: input.id },
    data: { deliveryStatus: input.status, providerMessageId: input.providerMessageId },
  });
}

export async function reserveVerification(
  input: { userId: string; tokenHash: string },
  client: AuthenticationDatabase,
): Promise<EmissionReservation> {
  if (!('$transaction' in client)) throw new Error('Serializable reservation requires PrismaClient.');
  return reserveWithRetry(client as PrismaClient, input, 0);
}

export function createAuthRepository(client: AuthenticationDatabase): AuthRepository {
  return {
    createUser: (input) => createUser(input, client),
    findUserByEmail: (email) => findUserByEmail(email, client),
    findUserById: (id) => findUserById(id, client),
    markEmailVerified: (id, verifiedAt) => markEmailVerified(id, verifiedAt, client),
    createSession: (input) => createSession(input, client),
    findSessionByTokenHash: (tokenHash) => findSessionByTokenHash(tokenHash, client),
    revokeSessionByTokenHash: (tokenHash, revokedAt) => revokeSessionByTokenHash(tokenHash, revokedAt, client),
    createVerification: (input) => createVerification(input, client),
    findVerificationByTokenHash: (tokenHash) => findVerificationByTokenHash(tokenHash, client),
    invalidateActiveVerifications: (userId, invalidatedAt) =>
      invalidateActiveVerifications(userId, invalidatedAt, client),
    updateVerificationDelivery: (id, status, providerMessageId) =>
      updateVerificationDelivery({ id, status, providerMessageId }, client),
    reserveVerification: (input) => reserveVerification(input, client),
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
    if (isSerializationConflict(error) && attempt < MAX_SERIALIZATION_RETRIES) {
      return reserveWithRetry(client, input, attempt + 1);
    }
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
      issuedAt: now, expiresAt: new Date(now.getTime() + VERIFICATION_EXPIRATION_MS),
    },
  });
  return { status: 'reserved', emission };
}

export function getEmissionRetryAfter(emissions: { issuedAt: Date }[], now: Date): number {
  const latest = emissions.at(-1)?.issuedAt;
  const intervalWait = latest ? latest.getTime() + MINIMUM_INTERVAL_MS - now.getTime() : 0;
  const windowWait = emissions.length >= MAX_WINDOW_EMISSIONS
    ? (emissions[0]?.issuedAt.getTime() ?? now.getTime()) + WINDOW_MS - now.getTime()
    : 0;
  const waitMs = Math.max(intervalWait, windowWait);
  return waitMs > 0 ? Math.ceil(waitMs / 1000) : 0;
}

function isSerializationConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034';
}

export type { VerificationEmission };
