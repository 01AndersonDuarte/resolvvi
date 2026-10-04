import { Router } from 'express';
import { createProcessAiSummaryController } from '../controllers/process-ai-summary-controller.js';
import { createSessionMiddleware } from '../middlewares/session-middleware.js';
import { validateBody } from '../middlewares/validation-middleware.js';
import {
  parseSummaryFeedbackBody,
  parseSummaryGenerationBody,
} from '../schemas/process-ai-summary-schema.js';
import type { ProcessAiSummaryRouterDependencies } from '../types/http.js';

export function createProcessAiSummaryRouter(dependencies: ProcessAiSummaryRouterDependencies): Router {
  const router = Router();
  const controller = createProcessAiSummaryController(dependencies.service, dependencies.authService);
  const requireSession = createSessionMiddleware(dependencies.authService, dependencies.cookie);

  router.get('/processes/:id/ai-summary', requireSession, controller.read);
  router.post('/processes/:id/ai-summary/generations', requireSession, validateBody(parseSummaryGenerationBody), controller.requestGeneration);
  router.post('/processes/:id/ai-summary/:summaryId/feedback', requireSession, validateBody(parseSummaryFeedbackBody), controller.saveFeedback);

  return router;
}
