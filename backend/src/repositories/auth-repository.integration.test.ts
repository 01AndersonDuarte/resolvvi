import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { createAuthRepository } from './auth-repository.js';

dotenv.config({ path: '.env.test', quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (
  process.env.NODE_ENV !== 'test' ||
  !databaseUrl ||
  !new URL(databaseUrl).pathname.includes('_test') ||
  !process.env.DATABASE_LABEL?.endsWith('_test')
) {
  throw new Error('Testes de integração exigem NODE_ENV=test e DATABASE_LABEL isolado com sufixo _test.');
}

const email = 'auth-repository-integration@example.test';
let database: PrismaClient | undefined;

describe('repositórios de autenticação', () => {
  beforeAll(connectDatabase);
  beforeEach(removeUserFixture);
  afterAll(disconnectDatabase);

  it('impõe unicidade concorrente do e-mail sem substituir a senha aceita', enforceConcurrentEmailUniqueness);
  it('persiste sessões expiradas e permite revogação idempotente', persistAndRevokeSession);
  it('substitui sessão anterior e valida confirmação e expiração da conta', replaceAndValidateSessions);
  it('persiste a reserva de confirmação ligada à conta', persistVerificationEmission);
});

async function enforceConcurrentEmailUniqueness(): Promise<void> {
  const repository = createAuthRepository(database!);
  const results = await Promise.allSettled([
    repository.createUser({ email, passwordHash: 'hash-first' }),
    repository.createUser({ email, passwordHash: 'hash-second' }),
  ]);
  const persistedUser = await repository.findUserByEmail(email);

  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  expect(['hash-first', 'hash-second']).toContain(persistedUser?.passwordHash);
  expect(persistedUser?.emailVerifiedAt).toBeNull();
  expect(await repository.findUserById(persistedUser!.id)).toEqual(persistedUser);
  expect(await repository.markEmailVerified(persistedUser!.id, new Date('2026-10-03T20:00:00.000Z')))
    .toMatchObject({ emailVerifiedAt: new Date('2026-10-03T20:00:00.000Z') });
}

async function replaceAndValidateSessions(): Promise<void> {
  const repository = createAuthRepository(database!);
  const user = await repository.createUser({ email, passwordHash: 'session-hash' });
  const createdAt = new Date();
  const old = await repository.createSession({
    userId: user.id, tokenHash: 'e'.repeat(64), expiresAt: new Date(createdAt.getTime() + 60_000),
  });
  const expiresAt = new Date(createdAt.getTime() + 8 * 60 * 60_000);
  const current = await repository.replaceSession(
    { userId: user.id, tokenHash: 'f'.repeat(64), expiresAt }, old.tokenHash, createdAt,
  );

  expect((await repository.findSessionByTokenHash(old.tokenHash))?.revokedAt).toEqual(createdAt);
  expect(await repository.findValidSessionByTokenHash(current.tokenHash, createdAt)).toBeNull();
  await repository.markEmailVerified(user.id, createdAt);
  expect(await repository.findValidSessionByTokenHash(current.tokenHash, createdAt)).toMatchObject({
    id: current.id, user: { id: user.id, emailVerifiedAt: createdAt },
  });
  expect(await repository.findValidSessionByTokenHash(old.tokenHash, createdAt)).toBeNull();
  expect(await repository.findValidSessionByTokenHash(current.tokenHash, expiresAt)).toBeNull();
}

async function persistAndRevokeSession(): Promise<void> {
  const repository = createAuthRepository(database!);
  const user = await repository.createUser({ email, passwordHash: 'session-hash' });
  const expiresAt = new Date('2026-10-04T00:00:00.000Z');
  const session = await repository.createSession({ userId: user.id, tokenHash: 'a'.repeat(64), expiresAt });

  expect(session.expiresAt).toEqual(expiresAt);
  expect(await repository.revokeSessionByTokenHash(session.tokenHash, new Date('2026-10-03T20:00:00.000Z'))).toBe(1);
  expect(await repository.revokeSessionByTokenHash(session.tokenHash, new Date('2026-10-03T20:01:00.000Z'))).toBe(0);
  expect(await repository.findSessionByTokenHash(session.tokenHash)).toMatchObject({
    expiresAt,
    revokedAt: new Date('2026-10-03T20:00:00.000Z'),
  });
}

async function persistVerificationEmission(): Promise<void> {
  const repository = createAuthRepository(database!);
  const user = await repository.createUser({ email, passwordHash: 'verification-hash' });
  const expiresAt = new Date('2026-10-04T20:00:00.000Z');
  const emission = await repository.createVerification({ userId: user.id, tokenHash: 'b'.repeat(64), expiresAt });

  expect(emission).toMatchObject({ userId: user.id, tokenHash: 'b'.repeat(64), expiresAt });
  expect(await repository.invalidateActiveVerifications(user.id, new Date('2026-10-03T20:00:00.000Z'))).toBe(1);
  expect((await repository.findVerificationByTokenHash(emission.tokenHash))?.invalidatedAt)
    .toEqual(new Date('2026-10-03T20:00:00.000Z'));
  expect(await repository.updateVerificationDelivery(emission.id, 'ACCEPTED', 'provider-id'))
    .toMatchObject({ deliveryStatus: 'ACCEPTED', providerMessageId: 'provider-id' });
}

async function connectDatabase(): Promise<void> {
  const connection = await import('../config/database.js');
  database = connection.prisma;
  await database.$connect();
}

async function removeUserFixture(): Promise<void> {
  if (database) await database.user.deleteMany({ where: { email } });
}

async function disconnectDatabase(): Promise<void> {
  if (!database) return;

  await removeUserFixture();
  await database.$disconnect();
}
const reservationEmail = 'verification-reservation-integration@example.test';
let reservationDatabase: PrismaClient | undefined;

assertReservationDatabaseIsIsolated();

describe('verification emission reservations', () => {
  beforeAll(connectReservationDatabase);
  beforeEach(removeReservationFixture);
  afterAll(disconnectReservationDatabase);
  it('serializes concurrent reservations and enforces the minimum interval', reserveConcurrently);
  it('applies the five emission rolling window', enforcesRollingWindowLimit);
});

async function reserveConcurrently(): Promise<void> {
  const repository = createAuthRepository(reservationDatabase!);
  const user = await repository.createUser({ email: reservationEmail, passwordHash: 'reservation-hash' });
  const results = await Promise.all([
    repository.reserveVerification({ userId: user.id, tokenHash: 'c'.repeat(64) }),
    repository.reserveVerification({ userId: user.id, tokenHash: 'd'.repeat(64) }),
  ]);
  const limited = results.find((result) => result.status === 'limited');
  const emissions = await reservationDatabase!.emailVerification.findMany({ where: { userId: user.id } });

  expect(results.filter((result) => result.status === 'reserved')).toHaveLength(1);
  expect(limited?.status).toBe('limited');
  expect(limited?.status === 'limited' && limited.retryAfterSeconds > 0).toBe(true);
  expect(emissions).toHaveLength(1);
  expect(emissions[0]?.deliveryStatus).toBe('UNKNOWN');
}

async function enforcesRollingWindowLimit(): Promise<void> {
  const repository = createAuthRepository(reservationDatabase!);
  const user = await repository.createUser({ email: reservationEmail, passwordHash: 'window-hash' });
  const now = new Date();
  await reservationDatabase!.emailVerification.createMany({ data: recentEmissions(user.id, now) });
  const result = await repository.reserveVerification({
    userId: user.id, tokenHash: 'f'.repeat(64),
  });

  expect(result.status).toBe('limited');
  expect(result.status === 'limited' && result.retryAfterSeconds >= 600).toBe(true);
  expect(await reservationDatabase!.emailVerification.count({ where: { userId: user.id } })).toBe(5);
}

function recentEmissions(userId: string, now: Date): Prisma.EmailVerificationCreateManyInput[] {
  return [10, 20, 30, 40, 50].map((minutes, index) => ({
    userId,
    tokenHash: (index + 1).toString().repeat(64),
    issuedAt: new Date(now.getTime() - minutes * 60_000),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60_000),
  }));
}

function assertReservationDatabaseIsIsolated(): void {
  const databaseUrl = process.env.DATABASE_URL;
  if (process.env.NODE_ENV !== 'test' || !databaseUrl || !new URL(databaseUrl).pathname.includes('_test')) {
    throw new Error('Testes de integração exigem banco isolado com sufixo _test.');
  }
}

async function connectReservationDatabase(): Promise<void> {
  const connection = await import('../config/database.js');
  reservationDatabase = connection.prisma;
  await reservationDatabase.$connect();
}

async function removeReservationFixture(): Promise<void> {
  if (reservationDatabase) {
    await reservationDatabase.user.deleteMany({ where: { email: reservationEmail } });
  }
}

async function disconnectReservationDatabase(): Promise<void> {
  if (!reservationDatabase) return;
  await removeReservationFixture();
  await reservationDatabase.$disconnect();
}
