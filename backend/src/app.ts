import cors from 'cors';
import express, { type Express } from 'express';

import { errorMiddleware } from './middlewares/error-middleware.js';
import { createOriginMiddleware } from './middlewares/origin-middleware.js';
import { requestContextMiddleware } from './middlewares/request-context-middleware.js';
import { createHealthRouter } from './routers/health-router.js';
import type { AppDependencies } from './types/http.js';

const BODY_LIMIT = '8kb';

export type { AppDependencies };

export function createApp(dependencies: AppDependencies): Express {
  const app = express();
  const allowedOrigin = new URL(dependencies.publicAppUrl).origin;

  app.disable('x-powered-by');
  app.use(cors({ credentials: true, origin: allowedOrigin }));
  app.use(requestContextMiddleware);
  app.use('/api', (_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(createOriginMiddleware(allowedOrigin));
  app.use(express.json({ limit: BODY_LIMIT, strict: true }));
  if (dependencies.authRouter) app.use('/api', dependencies.authRouter);
  if (dependencies.processRouter) app.use('/api', dependencies.processRouter);
  if (dependencies.processAiSummaryRouter) app.use('/api', dependencies.processAiSummaryRouter);
  app.use(createHealthRouter(dependencies.healthHandler));
  app.use((_request, response) => response.status(404).json({ error: { code: 'NOT_FOUND' } }));
  app.use(errorMiddleware);

  return app;
}
