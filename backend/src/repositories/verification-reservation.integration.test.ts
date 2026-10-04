import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { createUserRepository } from './user-repository.js';
import { createVerificationRepository } from './verification-repository.js';

dotenv.config({ path: '.env.test', quiet: true });

const email = 'verification-reservation-integration@example.test';
let database: PrismaClient | undefined;

assertIsolatedTestDatabase();

describe('verification emission reservations', () => {
  beforeAll(connectDatabase);
  beforeEach(removeFixture);
  afterAll(disconnectDatabase);
  it('serializes concurrent reservations and enforces the minimum interval', reserveConcurrently);
  it('applies the five emission rolling window', enforcesRollingWindowLimit);
});

async function reserveConcurrently(): Promise<void> {
  const user = await createUserRepository(database!).create({ email, passwordHash: 'reservation-hash' });
  const repository = createVerificationRepository(database!);
  const results = await Promise.all([
    repository.reserve({ userId: user.id, tokenHash: 'c'.repeat(64) }),
    repository.reserve({ userId: user.id, tokenHash: 'd'.repeat(64) }),
  ]);
  const limited = results.find((result) => result.status === 'limited');
  const emissions = await database!.emailVerification.findMany({ where: { userId: user.id } });

  expect(results.filter((result) => result.status === 'reserved')).toHaveLength(1);
  expect(limited?.status).toBe('limited');
  expect(limited?.status === 'limited' && limited.retryAfterSeconds > 0).toBe(true);
  expect(emissions).toHaveLength(1);
  expect(emissions[0]?.deliveryStatus).toBe('UNKNOWN');
}

async function enforcesRollingWindowLimit(): Promise<void> {
  const user = await createUserRepository(database!).create({ email, passwordHash: 'window-hash' });
  const now = new Date();
  await database!.emailVerification.createMany({ data: recentEmissions(user.id, now) });
  const result = await createVerificationRepository(database!).reserve({
    userId: user.id, tokenHash: 'f'.repeat(64),
  });

  expect(result.status).toBe('limited');
  expect(result.status === 'limited' && result.retryAfterSeconds >= 600).toBe(true);
  expect(await database!.emailVerification.count({ where: { userId: user.id } })).toBe(5);
}

function recentEmissions(userId: string, now: Date): Prisma.EmailVerificationCreateManyInput[] {
  return [10, 20, 30, 40, 50].map((minutes, index) => ({
    userId,
    tokenHash: (index + 1).toString().repeat(64),
    issuedAt: new Date(now.getTime() - minutes * 60_000),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60_000),
  }));
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

async function removeFixture(): Promise<void> {
  if (database) await database.user.deleteMany({ where: { email } });
}

async function disconnectDatabase(): Promise<void> {
  if (!database) return;
  await removeFixture();
  await database.$disconnect();
}
