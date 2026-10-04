import { Router } from 'express';

import { createProcessController } from '../controllers/process-controller.js';
import { createSessionMiddleware } from '../middlewares/session-middleware.js';
import { validateBody } from '../middlewares/validation-middleware.js';
import { parseCnjInput } from '../schemas/process-schema.js';
import { createProcessService } from '../services/process-service.js';
import type { ProcessRouterDependencies } from '../types/http.js';

export function createProcessRouter(dependencies: ProcessRouterDependencies): Router {
  const router = Router();
  const controller = createProcessController(
    createProcessService(dependencies.processRepository, dependencies.movementRepository),
    dependencies.authService,
    dependencies.cookie,
  );
  const requireSession = createSessionMiddleware(dependencies.authService, dependencies.cookie);

  router.post('/processes/search', requireSession, validateBody(parseCnjInput), controller.search);
  router.get('/processes/:id', requireSession, controller.getById);
  router.get('/processes/:id/movements', requireSession, controller.getMovements);

  return router;
}
