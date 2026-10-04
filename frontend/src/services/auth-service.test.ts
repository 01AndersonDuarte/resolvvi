import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from './http-client';
import {
  loginAccount,
  registerAccount,
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
    respondWith(MESSAGE_RESPONSE, 201);
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

  it.each([
    ['register', () => registerAccount({ email: 'pessoa@example.com', password: '12345678' }, new AbortController().signal)],
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
    respondWith({ error: { code: 'ACCOUNT_ALREADY_EXISTS', message: 'Entre com sua senha.', field: null, retryAfterSeconds: null } }, 409);
    const failure = await registerAccount(
      { email: 'pessoa@example.com', password: '12345678' },
      new AbortController().signal,
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiRequestError);
    expect((failure as ApiRequestError).apiError.code).toBe('ACCOUNT_ALREADY_EXISTS');
  });
});
