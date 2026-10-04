import type { RequestHandler } from 'express';

import { readSessionSecret } from '../config/session-cookie.js';
import type { AuthService } from '../types/auth.js';
import type { SessionCookieConfiguration } from '../types/http.js';
import type { CnjInput } from '../types/process.js';
import type { RequestContext } from '../middlewares/request-context-middleware.js';
import { parseProcessId } from '../schemas/process-schema.js';
import type { ProcessService } from '../services/process-service.js';

export type ProcessController = {
  search: RequestHandler;
  getById: RequestHandler;
  getMovements: RequestHandler;
};
type ControllerContext = {
  processService: ProcessService;
  authService: AuthService;
  cookie: SessionCookieConfiguration;
};
type ResponseContext = {
  request: Parameters<RequestHandler>[0];
  response: Parameters<RequestHandler>[1];
  context: ControllerContext;
};

export function createProcessController(
  processService: ProcessService,
  authService: AuthService,
  cookie: SessionCookieConfiguration,
): ProcessController {
  const context = { processService, authService, cookie };
  return {
    search: (request, response) => sendSearchResult({ request, response, context }),
    getById: (request, response) => sendProcessDetails({ request, response, context }),
    getMovements: (request, response) => sendMovements({ request, response, context }),
  };
}

async function sendSearchResult(input: ResponseContext): Promise<void> {
  const { request, context } = input;
  const result = await context.processService.search((request.body as CnjInput).cnj);
  await sendAfterSessionCheck({ ...input, result });
}

async function sendProcessDetails(input: ResponseContext): Promise<void> {
  const { request, context } = input;
  const result = await context.processService.getById(parseProcessId(request.params.id));
  await sendAfterSessionCheck({ ...input, result });
}

async function sendMovements(input: ResponseContext): Promise<void> {
  const { request, context } = input;
  const routeId = request.params.id;
  const result = await context.processService.listMovements({
    id: typeof routeId === 'string' ? routeId : '',
    query: request.query,
  });
  await sendAfterSessionCheck({ ...input, result });
}

async function sendAfterSessionCheck(input: ResponseContext & { result: unknown }): Promise<void> {
  const { request, response, context, result } = input;
  await revalidateSession(request.headers.cookie, context.authService, context.cookie);
  if (isResponseUnavailable(response)) return;
  response.status(200).json(result);
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
