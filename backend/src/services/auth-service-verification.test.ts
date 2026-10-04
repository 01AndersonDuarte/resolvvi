import { describe, expect, it, vi } from 'vitest';

import type { AuthRepository } from '../types/auth.js';
import type { VerificationSender } from '../types/resend.js';
import { digestSecret } from './security-service.js';
import { createAuthService } from './auth-service.js';

const token = Buffer.alloc(32, 7).toString('base64url');
const consumeVerification = vi.fn<(tokenHash: string) => Promise<boolean>>();
const service = createAuthService({
  publicAppUrl: 'https://app.example',
  repositories: { consumeVerification } as unknown as AuthRepository,
  sender: {} as VerificationSender,
});

describe('email verification service', () => {
  it('consumes the digest and returns the sign-in instruction without creating a session', confirmsValidToken);
  it.each(['bad', `${token}=`, token.slice(0, -1)])('rejects malformed token %s without database access', rejectsMalformedToken);
  it('returns the same invalid-link response when a token was already consumed or replaced', rejectsInactiveToken);
  it('maps persistence failures to a recoverable response', mapsPersistenceFailure);
});

async function confirmsValidToken(): Promise<void> {
  consumeVerification.mockReset().mockResolvedValue(true);

  await expect(service.confirm({ token })).resolves.toEqual({
    message: 'E-mail confirmado. Agora você pode entrar.',
  });
  expect(consumeVerification).toHaveBeenCalledWith(digestSecret(token), expect.any(Date));
}

async function rejectsMalformedToken(invalidToken: string): Promise<void> {
  consumeVerification.mockReset();

  await expect(service.confirm({ token: invalidToken })).rejects.toMatchObject({
    code: 'VERIFICATION_INVALID', status: 400,
  });
  expect(consumeVerification).not.toHaveBeenCalled();
}

async function rejectsInactiveToken(): Promise<void> {
  consumeVerification.mockReset().mockResolvedValue(false);

  await expect(service.confirm({ token })).rejects.toMatchObject({ code: 'VERIFICATION_INVALID', status: 400 });
}

async function mapsPersistenceFailure(): Promise<void> {
  consumeVerification.mockReset().mockRejectedValue(new Error('private database failure'));

  await expect(service.confirm({ token })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', status: 503 });
}
