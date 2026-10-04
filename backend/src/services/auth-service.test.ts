import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticationUser, AuthRepository, CreateUserInput, EmissionReservation, VerificationEmission } from '../types/auth.js';
import type { VerificationSender } from '../types/resend.js';
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
  create: vi.fn<(input: CreateUserInput) => Promise<AuthenticationUser>>(),
  findByEmail: vi.fn<(email: string) => Promise<AuthenticationUser | null>>(),
};
const verifications = {
  updateDelivery: vi.fn<(id: string, status: 'ACCEPTED' | 'FAILED', providerMessageId: string | null) => Promise<VerificationEmission>>(),
  reserve: vi.fn<(input: { userId: string; tokenHash: string }) => Promise<EmissionReservation>>(),
};
const sender = { send: vi.fn() } as unknown as VerificationSender;
const repositories = {
  createUser: users.create,
  findUserByEmail: users.findByEmail,
  reserveVerification: verifications.reserve,
  updateVerificationDelivery: verifications.updateDelivery,
} as unknown as AuthRepository;
const service = createAuthService({
  publicAppUrl: 'https://app.example', repositories, sender,
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
const failureUser: AuthenticationUser = {
  id: 'user-id', email: 'person@example.test', passwordHash: 'existing-hash',
  emailVerifiedAt: null, createdAt: new Date('2026-10-03T20:00:00Z'),
};
const failureEmission = {
  id: 'emission-id', userId: failureUser.id, tokenHash: 'a'.repeat(64),
  issuedAt: new Date('2026-10-03T20:00:00Z'), expiresAt: new Date('2026-10-04T20:00:00Z'),
  consumedAt: null, invalidatedAt: null, deliveryStatus: 'UNKNOWN' as const, providerMessageId: null,
};
const failureUsers = {
  create: vi.fn<(input: CreateUserInput) => Promise<AuthenticationUser>>(),
  findByEmail: vi.fn<(email: string) => Promise<AuthenticationUser | null>>(),
};
const failureVerifications = {
  reserve: vi.fn<(input: { userId: string; tokenHash: string }) => Promise<EmissionReservation>>(),
  updateDelivery: vi.fn<(id: string, status: 'ACCEPTED' | 'FAILED', providerMessageId: string | null) => Promise<VerificationEmission>>(),
};
const failureSender = { send: vi.fn() } as unknown as VerificationSender;
const failureRepositories = {
  createUser: failureUsers.create,
  findUserByEmail: failureUsers.findByEmail,
  reserveVerification: failureVerifications.reserve,
  updateVerificationDelivery: failureVerifications.updateDelivery,
} as unknown as AuthRepository;
const failureService = createAuthService({
  publicAppUrl: 'https://app.example', repositories: failureRepositories, sender: failureSender,
});

describe('registration failure recovery', registrationFailureCases);

function registrationFailureCases(): void {
  beforeEach(resetFailureMocks);
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

function resetFailureMocks(): void {
  vi.mocked(failureUsers.create).mockReset();
  vi.mocked(failureUsers.findByEmail).mockReset().mockResolvedValue(failureUser);
  vi.mocked(failureVerifications.reserve).mockReset().mockResolvedValue({ status: 'reserved', emission: failureEmission });
  vi.mocked(failureVerifications.updateDelivery).mockReset().mockResolvedValue(failureEmission);
  vi.mocked(failureSender.send).mockReset().mockResolvedValue({ status: 'accepted', providerMessageId: 'provider-id' });
}

async function reportDeliveryFailure(
  result: { status: 'failed' | 'unknown'; providerMessageId: null },
  status: number,
  code: string,
): Promise<void> {
  vi.mocked(failureSender.send).mockResolvedValue(result);
  await expect(failureService.resend({ email: failureUser.email })).rejects.toMatchObject({ status, code });
  expect(failureVerifications.reserve).toHaveBeenCalledOnce();
  expect(failureVerifications.updateDelivery).toHaveBeenCalledTimes(result.status === 'unknown' ? 0 : 1);
}

async function rejectInvalidInput(
  input: { email: string; password: string },
  status: number,
  field: string,
): Promise<void> {
  await expect(failureService.register(input)).rejects.toMatchObject({ status, field });
  expect(failureUsers.create).not.toHaveBeenCalled();
  expect(failureVerifications.reserve).not.toHaveBeenCalled();
}

async function createsPendingAccount(): Promise<void> {
  vi.mocked(failureUsers.findByEmail).mockResolvedValueOnce(null);
  vi.mocked(failureUsers.create).mockResolvedValue(failureUser);
  await failureService.register({ email: failureUser.email, password: 'original-password' });
  const createdInput = vi.mocked(failureUsers.create).mock.calls[0]?.[0];
  expect(createdInput?.email).toBe(failureUser.email);
  expect(createdInput?.passwordHash).toMatch(/^scrypt\$v1\$/);
  expect(failureSender.send).toHaveBeenCalledOnce();
}

async function mapsPersistenceFailure(): Promise<void> {
  vi.mocked(failureUsers.findByEmail).mockRejectedValue(new Error('private database detail'));

  await expect(failureService.register({ email: failureUser.email, password: 'validpassword' })).rejects.toMatchObject({
    code: 'SERVICE_UNAVAILABLE', status: 503,
  });
  expect(failureSender.send).not.toHaveBeenCalled();
}
