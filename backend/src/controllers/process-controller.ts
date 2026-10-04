import type { RequestHandler } from 'express';

import { readSessionSecret } from '../config/session-cookie.js';
import type { AuthService } from '../types/auth.js';
import type { SessionCookieConfiguration } from '../types/http.js';
import type { CnjInput } from '../types/process.js';
import type { RequestContext } from '../middlewares/request-context-middleware.js';
import type { ProcessService } from '../services/process-service.js';

export type ProcessController = { search: RequestHandler; getById: RequestHandler };

export function createProcessController(
  processService: ProcessService,
  authService: AuthService,
  cookie: SessionCookieConfiguration,
): ProcessController {
  return {
    search: async (request, response) => {
      const result = await processService.search((request.body as CnjInput).cnj);
      await revalidateSession(request.headers.cookie, authService, cookie);
      if (isResponseUnavailable(response)) return;
      response.status(200).json(result);
    },
    getById: async (request, response) => {
      const param = request.params.id;
      const result = await processService.getById(typeof param === 'string' ? param : '');
      await revalidateSession(request.headers.cookie, authService, cookie);
      if (isResponseUnavailable(response)) return;
      response.status(200).json(result);
    },
  };
}

function isResponseUnavailable(response: Parameters<RequestHandler>[1]): boolean {
  const context = response.locals.requestContext as RequestContext | undefined;
  return response.destroyed || response.headersSent || context?.timedOut === true;
}

async function revalidateSession(
  cookieHeader: string | undefined,
  authService: AuthService,
  cookie: SessionCookieConfiguration,
): Promise<void> {
  await authService.getSession(readSessionSecret(cookieHeader, cookie.name));
}
