import type { LoginInput, RegistrationInput, SessionContext } from '../types/auth.js';
import type { AuthService } from '../types/auth.js';
import type { AuthController, SessionCookieConfiguration } from '../types/http.js';
import { readSessionSecret } from '../config/session-cookie.js';

export type { AuthController };

const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export function createAuthController(service: AuthService, cookie: SessionCookieConfiguration): AuthController {
  return {
    register: createRegisterHandler(service),
    login: createLoginHandler(service, cookie),
    session: (_request, response) => response.status(200).json(toPublicSession(response.locals.session as SessionContext)),
    logout: createLogoutHandler(service, cookie),
  };
}

function createRegisterHandler(service: AuthService): AuthController['register'] {
  return async (request, response) => {
    const result = await service.register(request.body as RegistrationInput);
    response.status(201).json(result);
  };
}

function createLoginHandler(service: AuthService, cookie: SessionCookieConfiguration): AuthController['login'] {
  return async (request, response) => {
    const grant = await service.login(
      request.body as LoginInput, readSessionSecret(request.headers.cookie, cookie.name),
    );
    if (response.destroyed || response.headersSent) return;
    setSessionCookie({ response, secret: grant.secret, expiresAt: grant.expiresAt, cookie });
    response.status(200).json(toPublicSession(grant));
  };
}

function setSessionCookie(input: {
  response: Parameters<AuthController['login']>[1];
  secret: string;
  expiresAt: string;
  cookie: SessionCookieConfiguration;
}): void {
  const remainingMs = Math.min(COOKIE_MAX_AGE_MS, Date.parse(input.expiresAt) - Date.now());
  input.response.cookie(input.cookie.name, input.secret, {
    httpOnly: true, secure: input.cookie.secure, sameSite: 'lax', path: '/', maxAge: Math.max(0, remainingMs),
  });
}

function createLogoutHandler(service: AuthService, cookie: SessionCookieConfiguration): AuthController['logout'] {
  return async (request, response) => {
    await service.logout(readSessionSecret(request.headers.cookie, cookie.name));
    response.clearCookie(cookie.name, { httpOnly: true, secure: cookie.secure, sameSite: 'lax', path: '/' });
    response.status(204).end();
  };
}

function toPublicSession(session: SessionContext): Omit<SessionContext, 'userId'> {
  return { sessionId: session.sessionId, expiresAt: session.expiresAt, serverTime: session.serverTime };
}
