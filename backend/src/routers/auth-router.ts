import { Router } from 'express';

import { createAuthController } from '../controllers/auth-controller.js';
import type { AuthService } from '../services/auth-service.js';

export function createAuthRouter(service: AuthService): Router {
  const router = Router();
  const controller = createAuthController(service);
  router.post('/auth/register', controller.register);
  router.post('/auth/resend-verification', controller.resend);

  return router;
}
