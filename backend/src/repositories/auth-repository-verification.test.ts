import { describe, expect, it, vi } from 'vitest';

import type { AuthenticationDatabase } from '../types/database.js';
import { consumeVerification } from './auth-repository.js';

const now = new Date('2026-10-03T20:00:00.000Z');
const deadline = new Date(Date.now() + 12_000);

describe('consumeVerification validity boundaries', () => {
  it('expires the link at exactly its expiration instant', expiresAtBoundary);
  it('allows a link immediately before expiration and updates both records', allowsUntilExpiration);
  it.each(['consumedAt', 'invalidatedAt'] as const)('rejects links with %s set', rejectsInactiveState);
  it('rejects an unknown token without updating records', rejectsUnknownToken);
  it('retries a PostgreSQL serialization conflict before evaluating the link', retriesSerializationConflict);
});

async function expiresAtBoundary(): Promise<void> {
  const fixture = makeDatabase(new Date(now), null, null);

  await expect(consumeVerification('token-hash', fixture.database, deadline)).resolves.toBe(false);
  expect(fixture.consume).not.toHaveBeenCalled();
}

async function allowsUntilExpiration(): Promise<void> {
  const fixture = makeDatabase(new Date(now.getTime() + 1), null, null);

  await expect(consumeVerification('token-hash', fixture.database, deadline)).resolves.toBe(true);
  expect(fixture.consume).toHaveBeenCalledOnce();
  expect(fixture.verifyUser).toHaveBeenCalledOnce();
}

async function rejectsInactiveState(field: 'consumedAt' | 'invalidatedAt'): Promise<void> {
  const fixture = makeDatabase(new Date(now.getTime() + 1), field === 'consumedAt' ? now : null, field === 'invalidatedAt' ? now : null);

  await expect(consumeVerification('token-hash', fixture.database, deadline)).resolves.toBe(false);
  expect(fixture.consume).not.toHaveBeenCalled();
}

async function rejectsUnknownToken(): Promise<void> {
  const fixture = makeDatabase(null, null, null);

  await expect(consumeVerification('token-hash', fixture.database, deadline)).resolves.toBe(false);
  expect(fixture.consume).not.toHaveBeenCalled();
}

async function retriesSerializationConflict(): Promise<void> {
  const transact = vi.fn()
    .mockRejectedValueOnce({ kind: 'TransactionWriteConflict', originalCode: '40001' })
    .mockImplementationOnce(async (operation: (value: unknown) => Promise<boolean>) => operation({
      $queryRaw: vi.fn().mockResolvedValue([{ now }]),
      emailVerification: { findUnique: vi.fn().mockResolvedValue(null) },
    }));
  const database = { $transaction: transact } as unknown as AuthenticationDatabase;

  await expect(consumeVerification('token-hash', database, deadline)).resolves.toBe(false);
  expect(transact).toHaveBeenCalledTimes(2);
}

function makeDatabase(expiresAt: Date | null, consumedAt: Date | null, invalidatedAt: Date | null): {
  database: AuthenticationDatabase;
  consume: ReturnType<typeof vi.fn>;
  verifyUser: ReturnType<typeof vi.fn>;
} {
  const consume = vi.fn().mockResolvedValue({ count: 1 });
  const verifyUser = vi.fn().mockResolvedValue({ count: 1 });
  const verification = expiresAt ? { id: 'verification-id', userId: 'user-id', expiresAt, consumedAt, invalidatedAt } : null;
  const transaction = {
    $queryRaw: vi.fn().mockResolvedValue([{ now }]),
    emailVerification: { findUnique: vi.fn().mockResolvedValue(verification), updateMany: consume },
    user: { updateMany: verifyUser },
  };
  const database = {
    $transaction: async (operation: (value: typeof transaction) => Promise<boolean>) => operation(transaction),
  } as unknown as AuthenticationDatabase;

  return { database, consume, verifyUser };
}
