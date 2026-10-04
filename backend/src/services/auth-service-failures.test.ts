import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticationUser } from '../protocols.js';
import type { UserRepository } from '../repositories/user-repository.js';
import type { VerificationRepository } from '../repositories/verification-repository.js';
import type { VerificationSender } from './resend-service.js';
import { createAuthService } from './auth-service.js';

const user: AuthenticationUser = {
  id: 'user-id', email: 'person@example.test', passwordHash: 'existing-hash',
  emailVerifiedAt: null, createdAt: new Date('2026-10-03T20:00:00Z'),
};
const emission = {
  id: 'emission-id', userId: user.id, tokenHash: 'a'.repeat(64),
  issuedAt: new Date('2026-10-03T20:00:00Z'), expiresAt: new Date('2026-10-04T20:00:00Z'),
  consumedAt: null, invalidatedAt: null, deliveryStatus: 'UNKNOWN' as const, providerMessageId: null,
};
const users = { create: vi.fn(), findByEmail: vi.fn() } as unknown as UserRepository;
const verifications = { reserve: vi.fn(), updateDelivery: vi.fn() } as unknown as VerificationRepository;
const sender = { send: vi.fn() } as unknown as VerificationSender;
const service = createAuthService({
  publicAppUrl: 'https://app.example', users, verifications, sender,
});

describe('registration failure recovery', failureCases);

function failureCases(): void {
  beforeEach(resetMocks);
  it.each([
    [{ status: 'failed', providerMessageId: null }, 502, 'CONFIRMATION_SEND_FAILED'],
    [{ status: 'unknown', providerMessageId: null }, 504, 'CONFIRMATION_SEND_UNKNOWN'],
  ] as const)('preserves account after provider result %s', reportDeliveryFailure);
  it.each([
    [{ email: 'bad', password: 'validpassword' }, 400, 'email'],
    [{ email: 'person@example.test', password: 'short' }, 400, 'password'],
  ] as const)('rejects invalid inputs before persistence', rejectInvalidInput);
  it('persists a newly hashed account before sending confirmation', createsPendingAccount);
  it('maps persistence errors to a recoverable service response', mapsPersistenceFailure);
}

function resetMocks(): void {
  vi.mocked(users.create).mockReset();
  vi.mocked(users.findByEmail).mockReset().mockResolvedValue(user);
  vi.mocked(verifications.reserve).mockReset().mockResolvedValue({ status: 'reserved', emission });
  vi.mocked(verifications.updateDelivery).mockReset().mockResolvedValue(emission);
  vi.mocked(sender.send).mockReset().mockResolvedValue({ status: 'accepted', providerMessageId: 'provider-id' });
}

async function reportDeliveryFailure(
  result: { status: 'failed' | 'unknown'; providerMessageId: null },
  status: number,
  code: string,
): Promise<void> {
  vi.mocked(sender.send).mockResolvedValue(result);
  await expect(service.resend({ email: user.email })).rejects.toMatchObject({ status, code });
  expect(verifications.reserve).toHaveBeenCalledOnce();
  expect(verifications.updateDelivery).toHaveBeenCalledTimes(result.status === 'unknown' ? 0 : 1);
}

async function rejectInvalidInput(
  input: { email: string; password: string },
  status: number,
  field: string,
): Promise<void> {
  await expect(service.register(input)).rejects.toMatchObject({ status, field });
  expect(users.create).not.toHaveBeenCalled();
  expect(verifications.reserve).not.toHaveBeenCalled();
}

async function createsPendingAccount(): Promise<void> {
  vi.mocked(users.findByEmail).mockResolvedValueOnce(null);
  vi.mocked(users.create).mockResolvedValue(user);
  await service.register({ email: user.email, password: 'original-password' });
  const createdInput = vi.mocked(users.create).mock.calls[0]?.[0];
  expect(createdInput?.email).toBe(user.email);
  expect(createdInput?.passwordHash).toMatch(/^scrypt\$v1\$/);
  expect(sender.send).toHaveBeenCalledOnce();
}

async function mapsPersistenceFailure(): Promise<void> {
  vi.mocked(users.findByEmail).mockRejectedValue(new Error('private database detail'));

  await expect(service.register({ email: user.email, password: 'validpassword' })).rejects.toMatchObject({
    code: 'SERVICE_UNAVAILABLE', status: 503,
  });
  expect(sender.send).not.toHaveBeenCalled();
}
