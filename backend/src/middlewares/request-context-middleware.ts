import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

const REQUEST_TIMEOUT_MS = 12_000;

export type RequestContext = {
  deadline: number;
  requestId: string;
  timedOut: boolean;
};

export const requestContextMiddleware: RequestHandler = (_request, response, next) => {
  const context: RequestContext = {
    deadline: Date.now() + REQUEST_TIMEOUT_MS,
    requestId: randomUUID(),
    timedOut: false,
  };
  response.locals.requestContext = context;
  response.setHeader('X-Request-Id', context.requestId);

  const timeout = setTimeout(() => {
    context.timedOut = true;
    if (!response.headersSent) {
      response.status(504).json({
        error: {
          code: 'REQUEST_TIMEOUT',
          field: null,
          message: 'A solicitação demorou mais do que o esperado. Tente novamente.',
          retryAfterSeconds: null,
        },
      });
    }
  }, REQUEST_TIMEOUT_MS);
  response.once('finish', () => clearTimeout(timeout));
  response.once('close', () => clearTimeout(timeout));
  next();
};
