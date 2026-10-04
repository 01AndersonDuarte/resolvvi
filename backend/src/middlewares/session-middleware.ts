import type { RequestHandler } from 'express';

import type { AuthService } from '../types/auth.js';
import type { SessionCookieConfiguration } from '../types/http.js';
import { readSessionSecret } from '../config/session-cookie.js';

export function createSessionMiddleware(
  service: AuthService,
  cookie: SessionCookieConfiguration,
): RequestHandler {
  return async (request, response, next) => {
    const secret = readSessionSecret(request.headers.cookie, cookie.name);
    response.locals.session = await service.getSession(secret);
    next();
  };
}
