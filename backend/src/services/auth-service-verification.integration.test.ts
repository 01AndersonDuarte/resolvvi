import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

import type { PrismaClient } from '../generated/prisma/client.js';
import { createAuthRepository } from '../repositories/auth-repository.js';
import type { AuthService } from '../types/auth.js';
import type { VerificationSender } from '../types/resend.js';
import { digestSecret } from './security-service.js';
import { createAuthService } from './auth-service.js';

dotenv.config({ path: '.env.test', quiet: true });

const fixturePrefix = 'email-confirmation-integration-';
const rawToken = randomBytes(32).toString('base64url');
let database: PrismaClient | undefined;

assertIsolatedTestDatabase();

describe('email confirmation persistence', () => {
  beforeAll(connectDatabase);
  beforeEach(removeFixtures);
  afterAll(disconnectDatabase);

  it('confirms only the account linked to a valid token and creates no session', confirmsLinkedAccount);
  it('rejects expired, replaced, consumed, and unknown links without confirming an account', rejectsInactiveLinks);
  it('allows exactly one successful consumer under concurrent requests', allowsOneConcurrentConsumer);
  it('keeps confirmation and reissue in one serial order', serializesConfirmationAndResend);
});

async function confirmsLinkedAccount(): Promise<void> {
  const repository = createAuthRepository(database!);
  const user = await repository.createUser({ email: `${fixturePrefix}valid@example.test`, passwordHash: 'hash' });
  const other = await repository.createUser({ email: `${fixturePrefix}other@example.test`, passwordHash: 'hash' });
  await repository.createVerification({ userId: user.id, tokenHash: digestSecret(rawToken), expiresAt: futureExpiry() });

  await expect(buildService().confirm({ token: rawToken })).resolves.toEqual({
    message: 'E-mail confirmado. Agora você pode entrar.',
  });
  expect((await repository.findUserById(user.id))?.emailVerifiedAt).toBeInstanceOf(Date);
  expect((await repository.findUserById(other.id))?.emailVerifiedAt).toBeNull();
  expect(await database!.session.count({ where: { userId: user.id } })).toBe(0);
}

async function rejectsInactiveLinks(): Promise<void> {
  const repository = createAuthRepository(database!);
  const user = await repository.createUser({ email: `${fixturePrefix}inactive@example.test`, passwordHash: 'hash' });
  const expired = randomBytes(32).toString('base64url');
  const replaced = randomBytes(32).toString('base64url');
  const consumed = randomBytes(32).toString('base64url');
  await repository.createVerification({ userId: user.id, tokenHash: digestSecret(expired), expiresAt: new Date(Date.now() - 1_000) });
  const replacedEmission = await repository.createVerification({ userId: user.id, tokenHash: digestSecret(replaced), expiresAt: futureExpiry() });
  await repository.invalidateActiveVerifications(user.id, new Date());
  await repository.createVerification({ userId: user.id, tokenHash: digestSecret(consumed), expiresAt: futureExpiry() });
  await database!.emailVerification.update({ where: { tokenHash: digestSecret(consumed) }, data: { consumedAt: new Date() } });

  for (const token of [expired, replaced, consumed, randomBytes(32).toString('base64url')]) {
    await expect(buildService().confirm({ token })).rejects.toMatchObject({ code: 'VERIFICATION_INVALID' });
  }
  expect((await repository.findUserById(user.id))?.emailVerifiedAt).toBeNull();
  expect((await repository.findVerificationByTokenHash(replacedEmission.tokenHash))?.invalidatedAt).toBeInstanceOf(Date);
}

async function allowsOneConcurrentConsumer(): Promise<void> {
  const repository = createAuthRepository(database!);
  const user = await repository.createUser({ email: `${fixturePrefix}concurrent@example.test`, passwordHash: 'hash' });
  const token = randomBytes(32).toString('base64url');
  await repository.createVerification({ userId: user.id, tokenHash: digestSecret(token), expiresAt: futureExpiry() });

  const results = await Promise.allSettled([
    buildService().confirm({ token }),
    buildService().confirm({ token }),
  ]);

  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  expect((await repository.findUserById(user.id))?.emailVerifiedAt).toBeInstanceOf(Date);
  expect(await database!.session.count({ where: { userId: user.id } })).toBe(0);
}

async function serializesConfirmationAndResend(): Promise<void> {
  const repository = createAuthRepository(database!);
  const user = await repository.createUser({ email: `${fixturePrefix}race@example.test`, passwordHash: 'hash' });
  const token = randomBytes(32).toString('base64url');
  const emission = await repository.createVerification({ userId: user.id, tokenHash: digestSecret(token), expiresAt: futureExpiry() });
  const service = buildService();

  const outcomes = await Promise.allSettled([
    service.confirm({ token }),
    service.resend({ email: user.email }),
  ]);
  const persistedUser = await repository.findUserById(user.id);
  const persistedEmission = await repository.findVerificationByTokenHash(emission.tokenHash);

  expect(outcomes.some((outcome) => outcome.status === 'fulfilled')).toBe(true);
  expect(persistedUser?.emailVerifiedAt !== null).toBe(persistedEmission?.consumedAt !== null);
  expect(persistedEmission?.invalidatedAt !== null).toBe(persistedUser?.emailVerifiedAt === null);
}

function buildService(): AuthService {
  const sender: VerificationSender = {
    send: () => Promise.resolve({ status: 'accepted', providerMessageId: 'mail-id' }),
  };
  return createAuthService({
    publicAppUrl: 'https://app.example', repositories: createAuthRepository(database!), sender,
  });
}

function futureExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

async function removeFixtures(): Promise<void> {
  if (database) await database.user.deleteMany({ where: { email: { startsWith: fixturePrefix } } });
}

function assertIsolatedTestDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;
  if (process.env.NODE_ENV !== 'test' || !databaseUrl || !new URL(databaseUrl).pathname.includes('_test')) {
    throw new Error('Testes de integração exigem banco isolado com sufixo _test.');
  }
}

async function connectDatabase(): Promise<void> {
  const connection = await import('../config/database.js');
  database = connection.prisma;
  await database.$connect();
}

async function disconnectDatabase(): Promise<void> {
  if (!database) return;
  await removeFixtures();
  await database.$disconnect();
}
