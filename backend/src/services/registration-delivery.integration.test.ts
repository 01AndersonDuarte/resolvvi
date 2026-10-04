import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

import type { PrismaClient } from '../generated/prisma/client.js';
import { createUserRepository } from '../repositories/user-repository.js';
import { createVerificationRepository } from '../repositories/verification-repository.js';
import { createAuthService } from './auth-service.js';
import type { AuthService } from './auth-service.js';
import type { VerificationSender } from './resend-service.js';

dotenv.config({ path: '.env.test', quiet: true });

const emailPrefix = 'registration-delivery-integration-';
let database: PrismaClient | undefined;

assertIsolatedTestDatabase();

describe('registration delivery persistence', () => {
  beforeAll(connectDatabase);
  beforeEach(cleanFixtures);
  it('persists a pending account after accepted delivery', persistsAcceptedDelivery);
  afterAll(disconnectDatabase);
  it('persists an account and a failed emission after provider rejection', persistsFailedDelivery);
  it('preserves account and unknown emission after transport timeout', preservesUnknownDelivery);
});

async function persistsAcceptedDelivery(): Promise<void> {
  const email = `${emailPrefix}accepted@example.test`;
  await buildService({ status: 'accepted', providerMessageId: 'provider-id' })
    .register({ email, password: 'long-enough-password' });
  const user = await createUserRepository(database!).findByEmail(email);
  const emission = await database!.emailVerification.findFirst({ where: { userId: user!.id } });

  expect(user?.emailVerifiedAt).toBeNull();
  expect(emission).toMatchObject({ deliveryStatus: 'ACCEPTED', providerMessageId: 'provider-id' });
  expect(await database!.session.count({ where: { userId: user!.id } })).toBe(0);
}

async function persistsFailedDelivery(): Promise<void> {
  const email = `${emailPrefix}failed@example.test`;
  const service = buildService({ status: 'failed', providerMessageId: null });

  await expect(service.register({ email, password: 'long-enough-password' })).rejects.toMatchObject({ status: 502 });

  const user = await createUserRepository(database!).findByEmail(email);
  const emissions = await database!.emailVerification.findMany({ where: { userId: user!.id } });
  expect(user?.emailVerifiedAt).toBeNull();
  expect(user?.passwordHash).toMatch(/^scrypt\$v1\$/);
  expect(emissions).toHaveLength(1);
  expect(emissions[0]?.deliveryStatus).toBe('FAILED');
  expect(await database!.session.count({ where: { userId: user!.id } })).toBe(0);
}

async function preservesUnknownDelivery(): Promise<void> {
  const email = `${emailPrefix}unknown@example.test`;
  const service = buildService({ status: 'unknown', providerMessageId: null });

  await expect(service.register({ email, password: 'long-enough-password' })).rejects.toMatchObject({ status: 504 });

  const user = await createUserRepository(database!).findByEmail(email);
  const emissions = await database!.emailVerification.findMany({ where: { userId: user!.id } });
  expect(user?.emailVerifiedAt).toBeNull();
  expect(emissions).toHaveLength(1);
  expect(emissions[0]?.deliveryStatus).toBe('UNKNOWN');
  expect(await database!.session.count({ where: { userId: user!.id } })).toBe(0);
}

function buildService(result: Awaited<ReturnType<VerificationSender['send']>>): AuthService {
  const sender: VerificationSender = { send: () => Promise.resolve(result) };
  return createAuthService({
    publicAppUrl: 'https://app.example',
    users: createUserRepository(database!),
    verifications: createVerificationRepository(database!),
    sender,
  });
}

async function cleanFixtures(): Promise<void> {
  if (database) await database.user.deleteMany({ where: { email: { startsWith: emailPrefix } } });
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
  await database.user.deleteMany({ where: { email: { startsWith: emailPrefix } } });
  await database.$disconnect();
}
