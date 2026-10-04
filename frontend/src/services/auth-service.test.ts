import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from './http-client';
import {
  confirmEmail,
  loginAccount,
  registerAccount,
  resendVerification,
} from './auth-service';

const MESSAGE_RESPONSE = { message: 'Operação aceita.' };
const SESSION_RESPONSE = {
  sessionId: 'session-1',
  expiresAt: '2030-01-01T08:00:00.000Z',
  serverTime: '2030-01-01T00:00:00.000Z',
};

afterEach(() => vi.unstubAllGlobals());

function respondWith(body: unknown, status = 200): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
}

function expectPost(path: string, body: unknown, signal: AbortSignal): void {
  expect(fetch).toHaveBeenCalledWith(path, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

describe('authentication API service', () => {
  it('registers with the exact normalized identity and unchanged password', async () => {
    respondWith(MESSAGE_RESPONSE, 202);
    const signal = new AbortController().signal;
    const input = { email: 'pessoa@example.com', password: '  senha🙂  ' };

    await expect(registerAccount(input, signal)).resolves.toEqual(MESSAGE_RESPONSE);
    expectPost('/api/auth/register', input, signal);
  });

  it('logs in and validates the public session response', async () => {
    respondWith(SESSION_RESPONSE);
    const signal = new AbortController().signal;
    const input = { email: 'pessoa@example.com', password: '1234567' };

    await expect(loginAccount(input, signal)).resolves.toEqual(SESSION_RESPONSE);
    expectPost('/api/auth/login', input, signal);
  });

  it('requests resend with only the e-mail address', async () => {
    respondWith(MESSAGE_RESPONSE, 202);
    const signal = new AbortController().signal;
    const input = { email: 'pessoa@example.com' };

    await expect(resendVerification(input, signal)).resolves.toEqual(MESSAGE_RESPONSE);
    expectPost('/api/auth/resend-verification', input, signal);
  });

  it('confirms with the exact token and supplied abort signal', async () => {
    respondWith(MESSAGE_RESPONSE);
    const signal = new AbortController().signal;
    const token = 'token_sem-alteracao-123';

    await expect(confirmEmail(token, signal)).resolves.toEqual(MESSAGE_RESPONSE);
    expectPost('/api/auth/verify-email', { token }, signal);
  });

  it.each([
    ['register', () => registerAccount({ email: 'pessoa@example.com', password: '12345678' }, new AbortController().signal)],
    ['resend', () => resendVerification({ email: 'pessoa@example.com' }, new AbortController().signal)],
    ['confirmation', () => confirmEmail('token', new AbortController().signal)],
  ])('rejects a malformed %s message response', async (_operation, request) => {
    respondWith({ message: 42 });

    await expect(request()).rejects.toThrow('Resposta de mensagem inválida.');
  });

  it('rejects a malformed login session response', async () => {
    respondWith({ sessionId: 'session-1', expiresAt: null, serverTime: 'now' });

    await expect(loginAccount(
      { email: 'pessoa@example.com', password: '12345678' },
      new AbortController().signal,
    )).rejects.toThrow('Resposta de sessão inválida.');
  });

  it('preserves structured API failures for the authentication hooks', async () => {
    respondWith({
      error: {
        code: 'VERIFICATION_RATE_LIMITED',
        message: 'Aguarde para solicitar outro e-mail.',
        field: null,
        retryAfterSeconds: 42,
      },
    }, 429);

    const failure = await resendVerification(
      { email: 'pessoa@example.com' },
      new AbortController().signal,
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiRequestError);
    expect((failure as ApiRequestError).apiError).toEqual({
      code: 'VERIFICATION_RATE_LIMITED',
      message: 'Aguarde para solicitar outro e-mail.',
      field: null,
      retryAfterSeconds: 42,
    });
  });
});
