import { Router } from 'express';

import { createAuthController } from '../controllers/auth-controller.js';
import { validateBody } from '../middlewares/validation-middleware.js';
import { parseEmailInput, parseRegistrationInput } from '../schemas/auth-schema.js';
import type { AuthService } from '../types/auth.js';

export function createAuthRouter(service: AuthService): Router {
  const router = Router();
  const controller = createAuthController(service);
  router.post('/auth/register', validateBody(parseRegistrationInput), controller.register);
  router.post('/auth/resend-verification', validateBody(parseEmailInput), controller.resend);

  return router;
}
