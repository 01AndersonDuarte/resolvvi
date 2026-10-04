import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

import type { PrismaClient } from '../generated/prisma/client.js';
import { createAuthRepository } from '../repositories/auth-repository.js';
import { createAuthService } from './auth-service.js';
import type { AuthService } from '../types/auth.js';
import type { VerificationEmailInput } from '../types/resend.js';
import type { VerificationSender } from '../types/resend.js';
import { verifyPassword } from './security-service.js';

dotenv.config({ path: '.env.test', quiet: true });

const email = 'registration-concurrency-integration@example.test';
let database: PrismaClient | undefined;

assertIsolatedTestDatabase();

describe('concurrent registration requests', () => {
  beforeAll(connectDatabase);
  beforeEach(cleanFixture);
  afterAll(disconnectDatabase);
  it('preserves the first password and emits only once', protectsOriginalAccount);
  it('creates one account and emission for simultaneous first registrations', createsOneConcurrentAccount);
});

async function protectsOriginalAccount(): Promise<void> {
  const sentEmails: VerificationEmailInput[] = [];
  const service = createTestService(sentEmails);
  const originalPassword = 'original-password';
  await service.register({ email, password: originalPassword });
  const originalUser = await createAuthRepository(database!).findUserByEmail(email);
  const duplicates = await Promise.allSettled([
    service.register({ email: ` ${email.toUpperCase()} `, password: 'replacement-password-one' }),
    service.register({ email, password: 'replacement-password-two' }),
  ]);
  const persistedUser = await createAuthRepository(database!).findUserByEmail(email);

  expect(duplicates.filter((result) => result.status === 'rejected')).toHaveLength(2);
  expect(persistedUser?.passwordHash).toBe(originalUser?.passwordHash);
  expect(await verifyPassword(originalPassword, persistedUser!.passwordHash)).toBe(true);
  expect(await verifyPassword('replacement-password-one', persistedUser!.passwordHash)).toBe(false);
  expect(await database!.emailVerification.count({ where: { userId: persistedUser!.id } })).toBe(1);
  expect(sentEmails).toHaveLength(1);
}

async function createsOneConcurrentAccount(): Promise<void> {
  const sentEmails: VerificationEmailInput[] = [];
  const service = createTestService(sentEmails);
  const results = await Promise.allSettled([
    service.register({ email, password: 'first-password-value' }),
    service.register({ email: email.toUpperCase(), password: 'second-password-value' }),
  ]);
  const user = await createAuthRepository(database!).findUserByEmail(email);

  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(await database!.user.count({ where: { email } })).toBe(1);
  expect(await database!.emailVerification.count({ where: { userId: user!.id } })).toBe(1);
  expect(sentEmails).toHaveLength(1);
  expect(await verifyPassword('first-password-value', user!.passwordHash) ||
    await verifyPassword('second-password-value', user!.passwordHash)).toBe(true);
}

function createTestService(sentEmails: VerificationEmailInput[]): AuthService {
  const sender: VerificationSender = {
    send: (input) => {
      sentEmails.push(input);
      return Promise.resolve({ status: 'accepted', providerMessageId: 'provider-id' });
    },
  };
  return createAuthService({
    publicAppUrl: 'https://app.example',
    repositories: createAuthRepository(database!),
    sender,
  });
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

async function cleanFixture(): Promise<void> {
  if (database) await database.user.deleteMany({ where: { email } });
}

async function disconnectDatabase(): Promise<void> {
  if (!database) return;
  await cleanFixture();
  await database.$disconnect();
}
const emailPrefix = 'registration-delivery-integration-';
let deliveryDatabase: PrismaClient | undefined;

assertDeliveryDatabaseIsIsolated();

describe('registration delivery persistence', () => {
  beforeAll(connectDeliveryDatabase);
  beforeEach(cleanFixtures);
  it('persists a pending account after accepted delivery', persistsAcceptedDelivery);
  afterAll(disconnectDeliveryDatabase);
  it('persists an account and a failed emission after provider rejection', persistsFailedDelivery);
  it('preserves account and unknown emission after transport timeout', preservesUnknownDelivery);
});

async function persistsAcceptedDelivery(): Promise<void> {
  const email = `${emailPrefix}accepted@example.test`;
  await buildService({ status: 'accepted', providerMessageId: 'provider-id' })
    .register({ email, password: 'long-enough-password' });
  const user = await createAuthRepository(deliveryDatabase!).findUserByEmail(email);
  const emission = await deliveryDatabase!.emailVerification.findFirst({ where: { userId: user!.id } });

  expect(user?.emailVerifiedAt).toBeNull();
  expect(emission).toMatchObject({ deliveryStatus: 'ACCEPTED', providerMessageId: 'provider-id' });
  expect(await deliveryDatabase!.session.count({ where: { userId: user!.id } })).toBe(0);
}

async function persistsFailedDelivery(): Promise<void> {
  const email = `${emailPrefix}failed@example.test`;
  const service = buildService({ status: 'failed', providerMessageId: null });

  await expect(service.register({ email, password: 'long-enough-password' })).rejects.toMatchObject({ status: 502 });

  const user = await createAuthRepository(deliveryDatabase!).findUserByEmail(email);
  const emissions = await deliveryDatabase!.emailVerification.findMany({ where: { userId: user!.id } });
  expect(user?.emailVerifiedAt).toBeNull();
  expect(user?.passwordHash).toMatch(/^scrypt\$v1\$/);
  expect(emissions).toHaveLength(1);
  expect(emissions[0]?.deliveryStatus).toBe('FAILED');
  expect(await deliveryDatabase!.session.count({ where: { userId: user!.id } })).toBe(0);
}

async function preservesUnknownDelivery(): Promise<void> {
  const email = `${emailPrefix}unknown@example.test`;
  const service = buildService({ status: 'unknown', providerMessageId: null });

  await expect(service.register({ email, password: 'long-enough-password' })).rejects.toMatchObject({ status: 504 });

  const user = await createAuthRepository(deliveryDatabase!).findUserByEmail(email);
  const emissions = await deliveryDatabase!.emailVerification.findMany({ where: { userId: user!.id } });
  expect(user?.emailVerifiedAt).toBeNull();
  expect(emissions).toHaveLength(1);
  expect(emissions[0]?.deliveryStatus).toBe('UNKNOWN');
  expect(await deliveryDatabase!.session.count({ where: { userId: user!.id } })).toBe(0);
}

function buildService(result: Awaited<ReturnType<VerificationSender['send']>>): AuthService {
  const sender: VerificationSender = { send: () => Promise.resolve(result) };
  return createAuthService({
    publicAppUrl: 'https://app.example',
    repositories: createAuthRepository(deliveryDatabase!),
    sender,
  });
}

async function cleanFixtures(): Promise<void> {
  if (deliveryDatabase) {
    await deliveryDatabase.user.deleteMany({ where: { email: { startsWith: emailPrefix } } });
  }
}

function assertDeliveryDatabaseIsIsolated(): void {
  const databaseUrl = process.env.DATABASE_URL;
  if (process.env.NODE_ENV !== 'test' || !databaseUrl || !new URL(databaseUrl).pathname.includes('_test')) {
    throw new Error('Testes de integração exigem banco isolado com sufixo _test.');
  }
}

async function connectDeliveryDatabase(): Promise<void> {
  const connection = await import('../config/database.js');
  deliveryDatabase = connection.prisma;
  await deliveryDatabase.$connect();
}

async function disconnectDeliveryDatabase(): Promise<void> {
  if (!deliveryDatabase) return;
  await deliveryDatabase.user.deleteMany({ where: { email: { startsWith: emailPrefix } } });
  await deliveryDatabase.$disconnect();
}
