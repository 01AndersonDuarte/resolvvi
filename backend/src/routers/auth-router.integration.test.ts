import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { createAuthRouter } from './auth-router.js';
import { createAuthService } from '../services/auth-service.js';
import type { AuthenticationUser, AuthRepository, AuthService } from '../types/auth.js';
import type { VerificationSender } from '../types/resend.js';

const PUBLIC_APP_URL = 'http://localhost:5173';

describe('auth registration routes', () => {
  registrationCases();
  confirmationCases();
});

function registrationCases(): void {
  it('registers through the origin-protected endpoint and opens no session', async () => {
    const response = await request(createTestApp()).post('/api/auth/register')
      .set('Origin', PUBLIC_APP_URL).send({ email: 'person@example.test', password: 'validpassword' });

    expect(response.status).toBe(202);
    expect(response.text).toContain('Confira seu e-mail');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('rejects additional registration fields', async () => {
    const response = await request(createTestApp()).post('/api/auth/register')
      .set('Origin', PUBLIC_APP_URL)
      .send({ email: 'person@example.test', password: 'validpassword', role: 'admin' });

    expect(response.status).toBe(400);
    expect(response.text).toContain('INVALID_INPUT');
  });

  it('rejects an invalid email through the HTTP endpoint', async () => {
    const response = await request(createTestApp()).post('/api/auth/register')
      .set('Origin', PUBLIC_APP_URL).send({ email: 'not-an-email', password: 'validpassword' });

    expect(response.status).toBe(400);
    expect(response.text).toContain('INVALID_INPUT');
  });

  it('resends confirmation with a neutral response and no session cookie', async () => {
    const response = await request(createTestApp()).post('/api/auth/resend-verification')
      .set('Origin', PUBLIC_APP_URL).send({ email: 'person@example.test' });

    expect(response.status).toBe(202);
    expect(response.text).toContain('Se houver confirmação pendente');
    expect(response.headers['set-cookie']).toBeUndefined();
  });
}

function confirmationCases(): void {
  it('confirms a public token without opening a session', async () => {
    const response = await request(createTestApp()).post('/api/auth/verify-email')
      .set('Origin', PUBLIC_APP_URL).send({ token: Buffer.alloc(32, 1).toString('base64url') });

    expect(response.status).toBe(200);
    expect(response.text).toContain('E-mail confirmado. Agora você pode entrar.');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('returns the public invalid-link response for a missing token', async () => {
    const response = await request(createTestApp()).post('/api/auth/verify-email')
      .set('Origin', PUBLIC_APP_URL).send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: { code: 'VERIFICATION_INVALID' } });
    expect(response.text).not.toContain('person@example.test');
  });
}

function createTestApp(): ReturnType<typeof createApp> {
  const user: AuthenticationUser = {
    id: 'user-id', email: 'person@example.test', passwordHash: 'hash',
    emailVerifiedAt: new Date('2026-10-03T20:00:00Z'), createdAt: new Date('2026-10-03T20:00:00Z'),
  };
  const repositories = {
    findUserByEmail: vi.fn().mockResolvedValue(user),
    consumeVerification: vi.fn().mockResolvedValue(true),
  } as unknown as AuthRepository;
  const sender = {} as VerificationSender;
  const service: AuthService = createAuthService({
    publicAppUrl: PUBLIC_APP_URL, repositories, sender,
  });
  return createApp({ authRouter: createAuthRouter(service), publicAppUrl: PUBLIC_APP_URL });
}
