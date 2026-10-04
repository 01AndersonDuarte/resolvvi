import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

import type { PrismaClient } from '../generated/prisma/client.js';
import { createSessionRepository } from './session-repository.js';
import { createUserRepository } from './user-repository.js';
import { createVerificationRepository } from './verification-repository.js';

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
  it('persiste a reserva de confirmação ligada à conta', persistVerificationEmission);
});

async function enforceConcurrentEmailUniqueness(): Promise<void> {
  const repository = createUserRepository(database!);
  const results = await Promise.allSettled([
    repository.create({ email, passwordHash: 'hash-first' }),
    repository.create({ email, passwordHash: 'hash-second' }),
  ]);
  const persistedUser = await repository.findByEmail(email);

  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  expect(['hash-first', 'hash-second']).toContain(persistedUser?.passwordHash);
  expect(persistedUser?.emailVerifiedAt).toBeNull();
  expect(await repository.findById(persistedUser!.id)).toEqual(persistedUser);
  expect(await repository.markEmailVerified(persistedUser!.id, new Date('2026-10-03T20:00:00.000Z')))
    .toMatchObject({ emailVerifiedAt: new Date('2026-10-03T20:00:00.000Z') });
}

async function persistAndRevokeSession(): Promise<void> {
  const user = await createUserRepository(database!).create({ email, passwordHash: 'session-hash' });
  const repository = createSessionRepository(database!);
  const expiresAt = new Date('2026-10-04T00:00:00.000Z');
  const session = await repository.create({ userId: user.id, tokenHash: 'a'.repeat(64), expiresAt });

  expect(session.expiresAt).toEqual(expiresAt);
  expect(await repository.revokeByTokenHash(session.tokenHash, new Date('2026-10-03T20:00:00.000Z'))).toBe(1);
  expect(await repository.revokeByTokenHash(session.tokenHash, new Date('2026-10-03T20:01:00.000Z'))).toBe(0);
  expect(await repository.findByTokenHash(session.tokenHash)).toMatchObject({
    expiresAt,
    revokedAt: new Date('2026-10-03T20:00:00.000Z'),
  });
}

async function persistVerificationEmission(): Promise<void> {
  const user = await createUserRepository(database!).create({ email, passwordHash: 'verification-hash' });
  const repository = createVerificationRepository(database!);
  const expiresAt = new Date('2026-10-04T20:00:00.000Z');
  const emission = await repository.create({ userId: user.id, tokenHash: 'b'.repeat(64), expiresAt });

  expect(emission).toMatchObject({ userId: user.id, tokenHash: 'b'.repeat(64), expiresAt });
  expect(await repository.invalidateActiveForUser(user.id, new Date('2026-10-03T20:00:00.000Z'))).toBe(1);
  expect((await repository.findByTokenHash(emission.tokenHash))?.invalidatedAt)
    .toEqual(new Date('2026-10-03T20:00:00.000Z'));
  expect(await repository.updateDelivery(emission.id, 'ACCEPTED', 'provider-id'))
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
