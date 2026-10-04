import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { createAuthRouter } from './auth-router.js';
import { createAuthService } from '../services/auth-service.js';
import type { AuthRepository } from '../types/auth.js';

const origin = 'http://localhost:5173';
const repository = {
  createUser: vi.fn((input: { email: string; passwordHash: string }) => Promise.resolve({
    id: 'user-1', ...input, createdAt: new Date('2026-10-04T00:00:00Z'),
  })),
  findUserByEmail: vi.fn().mockResolvedValue(null),
};
const service = createAuthService({ repositories: repository as unknown as AuthRepository });
const app = createApp({ authRouter: createAuthRouter(service), publicAppUrl: origin });

describe('auth routes', () => {
  it('accepts a syntactic email and password and opens no session during registration', async () => {
    const response = await request(app).post('/api/auth/register')
      .set('Origin', origin).send({ email: 'example@email.com', password: 'validpassword' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Conta criada. Entre com seu e-mail e senha.' });
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('rejects extra registration fields and invalid email structure', async () => {
    const extra = await request(app).post('/api/auth/register').set('Origin', origin)
      .send({ email: 'example@email.com', password: 'validpassword', role: 'admin' });
    const malformed = await request(app).post('/api/auth/register').set('Origin', origin)
      .send({ email: 'not-an-email', password: 'validpassword' });

    expect(extra.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(repository.createUser).not.toHaveBeenCalled();
  });
});
