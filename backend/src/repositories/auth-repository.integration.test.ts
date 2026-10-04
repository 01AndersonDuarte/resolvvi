import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';
import type { PrismaClient } from '../generated/prisma/client.js';
import { createAuthRepository } from './auth-repository.js';

dotenv.config({ path: '.env.test', quiet: true });

const email = 'auth-repository-integration@example.test';
let database: PrismaClient | undefined;
assertIsolatedDatabase();

describe('auth repository', () => {
  beforeAll(connectDatabase);
  beforeEach(removeFixture);
  afterAll(disconnectDatabase);

  it('enforces email uniqueness while preserving the first stored password hash', async () => {
    const repository = createAuthRepository(database!);
    const results = await Promise.allSettled([
      repository.createUser({ email, passwordHash: 'first-hash' }),
      repository.createUser({ email, passwordHash: 'second-hash' }),
    ]);
    const user = await repository.findUserByEmail(email);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(['first-hash', 'second-hash']).toContain(user?.passwordHash);
    expect(await repository.findUserById(user!.id)).toEqual(user);
  });

  it('creates sessions and supports idempotent revocation', async () => {
    const repository = createAuthRepository(database!);
    const user = await repository.createUser({ email, passwordHash: 'session-hash' });
    const expiresAt = new Date('2026-10-04T00:00:00.000Z');
    const session = await repository.createSession({ userId: user.id, tokenHash: 'a'.repeat(64), expiresAt });

    expect(session.expiresAt).toEqual(expiresAt);
    expect(await repository.findValidSessionByTokenHash(session.tokenHash, new Date('2026-10-03T20:00:00Z')))
      .toMatchObject({ id: session.id, user: { id: user.id, email } });
    expect(await repository.revokeSessionByTokenHash(session.tokenHash, new Date('2026-10-03T20:00:00Z'))).toBe(1);
    expect(await repository.revokeSessionByTokenHash(session.tokenHash, new Date('2026-10-03T20:01:00Z'))).toBe(0);
  });
});

function assertIsolatedDatabase(): void {
  const url = process.env.DATABASE_URL;
  if (process.env.NODE_ENV !== 'test' || !url || !new URL(url).pathname.includes('_test') ||
    !process.env.DATABASE_LABEL?.endsWith('_test')) {
    throw new Error('Integration tests require an isolated test database.');
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
