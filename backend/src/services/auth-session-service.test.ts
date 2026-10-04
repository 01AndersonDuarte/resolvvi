import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticationUser, AuthRepository, AuthServiceDependencies } from '../types/auth.js';
import { createAuthService } from './auth-service.js';

const cryptoMocks = vi.hoisted(() => ({
  createDummyPasswordHash: vi.fn(),
  createSecret: vi.fn(),
  digestSecret: vi.fn(),
  hashPassword: vi.fn(),
  isValidSecret: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock('./security-service.js', () => cryptoMocks);

const NOW = new Date('2026-10-03T20:00:00.000Z');
const secret = Buffer.alloc(32, 7).toString('base64url');
const user: AuthenticationUser = {
  id: 'user-id', email: 'person@example.test', passwordHash: 'stored-hash',
  createdAt: NOW,
};
const repository = {
  findUserByEmail: vi.fn(), replaceSession: vi.fn(), findValidSessionByTokenHash: vi.fn(), findValidSessionById: vi.fn(),
  revokeSessionByTokenHash: vi.fn(),
} as unknown as AuthRepository;
const dependencies: AuthServiceDependencies = {
  repositories: repository, now: () => NOW,
};
const service = createAuthService(dependencies);

describe('session authentication service', () => {
  beforeEach(resetSessionMocks);

  it('authenticates with the stored password and creates a secret session for eight hours', createsSession);
  it('uses the same rejection for an unknown account and an incorrect password', rejectsInvalidCredentials);
  it('loads a session from its secret digest without extending its expiration', restoresSession);
  it('revalidates an internal session ID without returning a cookie', restoresSessionById);
  it('treats missing, expired, or revoked sessions as invalid', rejectsInvalidSessions);
  it('revokes a valid secret and surfaces infrastructure failure on logout', revokesSession);
});

function resetSessionMocks(): void {
  vi.mocked(cryptoMocks.createDummyPasswordHash).mockResolvedValue('dummy-hash');
  vi.mocked(cryptoMocks.createSecret).mockReturnValue(secret);
  vi.mocked(cryptoMocks.digestSecret).mockImplementation((value: string) => `digest:${value}`);
  vi.mocked(cryptoMocks.isValidSecret).mockReturnValue(true);
  vi.mocked(cryptoMocks.verifyPassword).mockResolvedValue(true);
  vi.mocked(repository.findUserByEmail).mockResolvedValue(user);
  vi.mocked(repository.replaceSession).mockResolvedValue({
    id: 'session-id', userId: user.id, tokenHash: `digest:${secret}`, createdAt: NOW,
    expiresAt: new Date(NOW.getTime() + 8 * 60 * 60 * 1000), revokedAt: null,
  });
  vi.mocked(repository.findValidSessionByTokenHash).mockResolvedValue({
    id: 'session-id', userId: user.id, tokenHash: `digest:${secret}`, createdAt: NOW,
    expiresAt: new Date(NOW.getTime() + 8 * 60 * 60 * 1000), revokedAt: null, user,
  });
  vi.mocked(repository.findValidSessionById).mockResolvedValue({
    id: 'session-id', userId: user.id, tokenHash: `digest:${secret}`, createdAt: NOW,
    expiresAt: new Date(NOW.getTime() + 8 * 60 * 60 * 1000), revokedAt: null,
  });
  vi.mocked(repository.revokeSessionByTokenHash).mockResolvedValue(1);
}

async function createsSession(): Promise<void> {
  const result = await service.login({ email: ' Person@Example.Test ', password: 'password' }, secret);

  expect(cryptoMocks.verifyPassword).toHaveBeenCalledWith('password', user.passwordHash, expect.any(Number));
  expect(repository.replaceSession).toHaveBeenCalledWith(
    expect.objectContaining({ userId: user.id, tokenHash: `digest:${secret}` }),
    `digest:${secret}`,
    NOW,
  );
  expect(result).toMatchObject({
    sessionId: 'session-id', expiresAt: '2026-10-04T04:00:00.000Z',
    serverTime: NOW.toISOString(), secret,
  });
}

async function rejectsInvalidCredentials(): Promise<void> {
  vi.mocked(repository.findUserByEmail).mockResolvedValueOnce(null);
  const unknownAccount = service.login({ email: user.email, password: 'password' });
  await expect(unknownAccount).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  expect(cryptoMocks.createDummyPasswordHash).toHaveBeenCalledOnce();

  vi.mocked(cryptoMocks.verifyPassword).mockResolvedValueOnce(false);
  await expect(service.login({ email: user.email, password: 'wrong-password' }))
    .rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
}

async function restoresSession(): Promise<void> {
  const result = await service.getSession(secret);

  expect(repository.findValidSessionByTokenHash).toHaveBeenCalledWith(`digest:${secret}`, NOW);
  expect(result).toMatchObject({ sessionId: 'session-id', serverTime: NOW.toISOString(), userId: user.id });
}

async function restoresSessionById(): Promise<void> {
  const result = await service.getSessionById('session-id');

  expect(repository.findValidSessionById).toHaveBeenCalledWith('session-id', NOW);
  expect(result).toMatchObject({ sessionId: 'session-id', userId: user.id, serverTime: NOW.toISOString() });
  expect(result).not.toHaveProperty('secret');
  vi.mocked(repository.findValidSessionById).mockResolvedValueOnce(null);
  await expect(service.getSessionById('session-id')).rejects.toMatchObject({ status: 401, code: 'SESSION_INVALID' });
}

async function rejectsInvalidSessions(): Promise<void> {
  vi.mocked(cryptoMocks.isValidSecret).mockReturnValueOnce(false);
  await expect(service.getSession(null)).rejects.toMatchObject({ status: 401, code: 'SESSION_INVALID' });
  vi.mocked(repository.findValidSessionByTokenHash).mockResolvedValueOnce(null);
  await expect(service.getSession(secret)).rejects.toMatchObject({ status: 401, code: 'SESSION_INVALID' });
}

async function revokesSession(): Promise<void> {
  await service.logout(secret);
  expect(repository.revokeSessionByTokenHash).toHaveBeenCalledWith(`digest:${secret}`, NOW);

  vi.mocked(repository.revokeSessionByTokenHash).mockRejectedValueOnce(new Error('private database failure'));
  await expect(service.logout(secret)).rejects.toMatchObject({ status: 503, code: 'SERVICE_UNAVAILABLE' });
}
