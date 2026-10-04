import { Router } from 'express';

import { createAuthController } from '../controllers/auth-controller.js';
import { createSessionMiddleware } from '../middlewares/session-middleware.js';
import { validateBody } from '../middlewares/validation-middleware.js';
import { parseLoginInput, parseRegistrationInput } from '../schemas/auth-schema.js';
import type { AuthService } from '../types/auth.js';
import type { SessionCookieConfiguration } from '../types/http.js';

export function createAuthRouter(service: AuthService, cookie: SessionCookieConfiguration = { name: 'session', secure: false }): Router {
  const router = Router();
  const controller = createAuthController(service, cookie);
  router.post('/auth/register', validateBody(parseRegistrationInput), controller.register);
  router.post('/auth/login', validateBody(parseLoginInput), controller.login);
  router.get('/auth/session', createSessionMiddleware(service, cookie), controller.session);
  router.post('/auth/logout', controller.logout);

  return router;
}
