import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticationUser } from '../protocols.js';
import type { UserRepository } from '../repositories/user-repository.js';
import type { VerificationRepository } from '../repositories/verification-repository.js';
import type { VerificationSender } from './resend-service.js';
import { createAuthService } from './auth-service.js';

const pendingUser: AuthenticationUser = {
  id: 'user-id', email: 'person@example.test', passwordHash: 'existing-hash', emailVerifiedAt: null,
  createdAt: new Date('2026-10-03T20:00:00Z'),
};
const emission = {
  id: 'emission-id', userId: pendingUser.id, tokenHash: 'a'.repeat(64),
  issuedAt: new Date('2026-10-03T20:00:00Z'), expiresAt: new Date('2026-10-04T20:00:00Z'), consumedAt: null,
  invalidatedAt: null, deliveryStatus: 'UNKNOWN' as const, providerMessageId: null,
};
const users = {
  create: vi.fn(), findByEmail: vi.fn(), findById: vi.fn(), markEmailVerified: vi.fn(),
} as unknown as UserRepository;
const verifications = {
  create: vi.fn(), findByTokenHash: vi.fn(), invalidateActiveForUser: vi.fn(),
  updateDelivery: vi.fn(), reserve: vi.fn(),
} as unknown as VerificationRepository;
const sender = { send: vi.fn() } as unknown as VerificationSender;
const service = createAuthService({
  publicAppUrl: 'https://app.example', users, verifications, sender,
  now: () => new Date('2026-10-03T20:00:00Z'),
});

describe('registration service', registrationCases);

function registrationCases(): void {
  beforeEach(resetMocks);
  it('normalizes and delivers a pending account', registerAndSendConfirmation);
  it('leaves a confirmed account and password unchanged', preserveConfirmedAccount);
  it('returns neutral responses for missing and confirmed resend targets', neutralResendResponses);
  it('returns retry timing when an emission is rate limited', reportRateLimit);
  it('does not send when confirmation wins the reservation race', skipsConfirmedReservation);
}

function resetMocks(): void {
  vi.mocked(users.create).mockReset();
  vi.mocked(users.findByEmail).mockReset();
  vi.mocked(verifications.reserve).mockReset().mockResolvedValue({ status: 'reserved', emission });
  vi.mocked(verifications.updateDelivery).mockReset().mockResolvedValue(emission);
  vi.mocked(sender.send).mockReset().mockResolvedValue({ status: 'accepted', providerMessageId: 'mail-id' });
}

async function registerAndSendConfirmation(): Promise<void> {
  vi.mocked(users.findByEmail).mockResolvedValue(pendingUser);
  const response = await service.register({ email: ' Person@Example.Test ', password: 'validpassword' });

  expect(response.message).toContain('Confira seu e-mail');
  expect(users.findByEmail).toHaveBeenCalledWith('person@example.test');
  expect(sender.send).toHaveBeenCalledWith(expect.objectContaining({ email: 'person@example.test', emissionId: emission.id }));
  expect(verifications.updateDelivery).toHaveBeenCalledWith(emission.id, 'ACCEPTED', 'mail-id');
  expect(users.create).not.toHaveBeenCalled();
}

async function preserveConfirmedAccount(): Promise<void> {
  vi.mocked(users.findByEmail).mockResolvedValue({ ...pendingUser, emailVerifiedAt: new Date() });
  await service.register({ email: pendingUser.email, password: 'validpassword' });

  expect(verifications.reserve).not.toHaveBeenCalled();
  expect(sender.send).not.toHaveBeenCalled();
  expect(users.create).not.toHaveBeenCalled();
}

async function neutralResendResponses(): Promise<void> {
  vi.mocked(users.findByEmail).mockResolvedValueOnce(null)
    .mockResolvedValueOnce({ ...pendingUser, emailVerifiedAt: new Date() });
  const first = await service.resend({ email: 'unknown@example.test' });
  const second = await service.resend({ email: pendingUser.email });

  expect(first.message).toBe(second.message);
  expect(verifications.reserve).not.toHaveBeenCalled();
  expect(sender.send).not.toHaveBeenCalled();
  expect(users.create).not.toHaveBeenCalled();
}

async function reportRateLimit(): Promise<void> {
  vi.mocked(users.findByEmail).mockResolvedValue(pendingUser);
  vi.mocked(verifications.reserve).mockResolvedValue({ status: 'limited', retryAfterSeconds: 42 });

  await expect(service.resend({ email: pendingUser.email })).rejects.toMatchObject({
    status: 429, retryAfterSeconds: 42, code: 'VERIFICATION_RATE_LIMITED',
  });
  expect(sender.send).not.toHaveBeenCalled();
}

async function skipsConfirmedReservation(): Promise<void> {
  vi.mocked(users.findByEmail).mockResolvedValue(pendingUser);
  vi.mocked(verifications.reserve).mockResolvedValue({ status: 'confirmed' });

  await service.resend({ email: pendingUser.email });

  expect(sender.send).not.toHaveBeenCalled();
  expect(verifications.updateDelivery).not.toHaveBeenCalled();
}
