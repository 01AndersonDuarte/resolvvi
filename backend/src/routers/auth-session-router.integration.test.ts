import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { ApplicationError } from '../errors/application-error.js';
import { createAuthRouter } from './auth-router.js';
import type { AuthService, SessionContext, SessionGrant } from '../types/auth.js';

const ORIGIN = 'https://app.example.test';
const COOKIE_NAME = '__Host-session';
const secret = Buffer.alloc(32, 3).toString('base64url');
const session: SessionContext = {
  sessionId: 'session-id', userId: 'user-id',
  expiresAt: '2026-10-04T04:00:00.000Z', serverTime: '2026-10-03T20:00:00.000Z',
};
const grant: SessionGrant = { ...session, secret };
const service = {
  register: vi.fn(), login: vi.fn(), getSession: vi.fn(), logout: vi.fn(),
} as unknown as AuthService;

describe('authentication session routes', () => {
  beforeEach(resetMocks);

  it('sets only the secure HttpOnly cookie and exposes the public session contract', loginSetsCookie);
  it('revalidates the cookie through the service on every session request', validatesSessionCookie);
  it('clears the cookie only after logout succeeds', clearsCookieAfterLogout);
  it('keeps the cookie when remote logout fails', preservesCookieAfterFailure);
});

function resetMocks(): void {
  vi.mocked(service.login).mockResolvedValue(grant);
  vi.mocked(service.getSession).mockResolvedValue(session);
  vi.mocked(service.logout).mockResolvedValue(undefined);
}

async function loginSetsCookie(): Promise<void> {
  const response = await request(createTestApp()).post('/api/auth/login')
    .set('Origin', ORIGIN).send({ email: 'person@example.test', password: 'validpassword' });

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ sessionId: session.sessionId, expiresAt: session.expiresAt, serverTime: session.serverTime });
  expect(JSON.stringify(response.body)).not.toContain(secret);
  const setCookie = response.headers['set-cookie']?.[0] ?? '';
  expect(setCookie).toContain(`${COOKIE_NAME}=${secret}`);
  expect(setCookie).toContain('HttpOnly');
  expect(setCookie).toContain('Secure');
  expect(setCookie).toContain('SameSite=Lax');
  expect(setCookie).toContain('Path=/');
}

async function validatesSessionCookie(): Promise<void> {
  const response = await request(createTestApp()).get('/api/auth/session').set('Cookie', `${COOKIE_NAME}=${secret}`);

  expect(response.status).toBe(200);
  expect(service.getSession).toHaveBeenCalledWith(secret);
  expect(response.body).not.toHaveProperty('userId');
}

async function clearsCookieAfterLogout(): Promise<void> {
  const response = await request(createTestApp()).post('/api/auth/logout')
    .set('Origin', ORIGIN).set('Cookie', `${COOKIE_NAME}=${secret}`).send({});

  expect(response.status).toBe(204);
  expect(service.logout).toHaveBeenCalledWith(secret);
  expect(response.headers['set-cookie']?.[0]).toContain(`${COOKIE_NAME}=;`);
}

async function preservesCookieAfterFailure(): Promise<void> {
  vi.mocked(service.logout).mockRejectedValueOnce(new ApplicationError({
    code: 'SERVICE_UNAVAILABLE', message: 'Falha temporária.', status: 503,
  }));
  const response = await request(createTestApp()).post('/api/auth/logout')
    .set('Origin', ORIGIN).set('Cookie', `${COOKIE_NAME}=${secret}`).send({});

  expect(response.status).toBe(503);
  expect(response.headers['set-cookie']).toBeUndefined();
}

function createTestApp(): ReturnType<typeof createApp> {
  return createApp({
    publicAppUrl: ORIGIN,
    authRouter: createAuthRouter(service, { name: COOKIE_NAME, secure: true }),
  });
}
