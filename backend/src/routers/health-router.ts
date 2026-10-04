import { Router, type RequestHandler } from 'express';

import { healthController } from '../controllers/health-controller.js';

export function createHealthRouter(handler: RequestHandler = healthController): Router {
  const router = Router();
  router.get('/health', handler);

  return router;
}
