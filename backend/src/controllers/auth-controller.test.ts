import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { createAuthController } from './auth-controller.js';
import type { AuthService, SessionGrant } from '../types/auth.js';

const grant: SessionGrant = {
  sessionId: 'session-id', userId: 'user-id',
  expiresAt: new Date(Date.now() + 60_000).toISOString(), serverTime: new Date().toISOString(), secret: 'secret',
};

describe('authentication controller', () => {
  it('does not set a session cookie after the response deadline has already been sent', avoidsLateCookie);
});

async function avoidsLateCookie(): Promise<void> {
  const service = { login: vi.fn().mockResolvedValue(grant) } as unknown as AuthService;
  const controller = createAuthController(service, { name: 'session', secure: false });
  const cookie = vi.fn();
  const json = vi.fn();
  const response = {
    destroyed: false,
    headersSent: true,
    cookie,
    status: vi.fn().mockReturnThis(),
    json,
  } as unknown as Response;

  await controller.login({
    body: { email: 'person@example.test', password: 'password' }, headers: {},
  } as Request, response, vi.fn());

  expect(cookie).not.toHaveBeenCalled();
  expect(json).not.toHaveBeenCalled();
}
