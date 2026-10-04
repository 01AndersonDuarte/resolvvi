import type { RequestHandler } from 'express';
import type { AuthService, SessionContext } from '../types/auth.js';
import type { RequestContext } from '../middlewares/request-context-middleware.js';
import {
  parseSummaryFeedbackBody,
  parseSummaryId,
  parseSummaryProcessId,
  parseSummaryReadQuery,
} from '../schemas/process-ai-summary-schema.js';
import type { ProcessAiSummaryService } from '../services/process-ai-summary-service.js';

export type ProcessAiSummaryController = {
  read: RequestHandler;
  requestGeneration: RequestHandler;
  saveFeedback: RequestHandler;
};

type ControllerDependencies = {
  authService: AuthService;
  service: ProcessAiSummaryService;
};

async function revalidateSession(sessionId: string, authService: AuthService): Promise<void> {
  await authService.getSessionById(sessionId);
}

function currentSession(response: Parameters<RequestHandler>[1]): SessionContext {
  const session = response.locals.session as SessionContext | undefined;
  if (!session) throw new Error('Session middleware did not populate the request context.');
  return session;
}

function isResponseUnavailable(response: Parameters<RequestHandler>[1]): boolean {
  const context = response.locals.requestContext as RequestContext | undefined;
  return response.destroyed || response.headersSent || context?.timedOut === true;
}

async function sendRead(
  request: Parameters<RequestHandler>[0],
  response: Parameters<RequestHandler>[1],
  dependencies: ControllerDependencies,
): Promise<void> {
  const session = currentSession(response);
  const result = await dependencies.service.read({
    processId: parseSummaryProcessId(request.params.id),
    userId: session.userId,
    ...parseSummaryReadQuery(request.query),
    requestId: (response.locals.requestContext as RequestContext | undefined)?.requestId,
  });
  await revalidateSession(session.sessionId, dependencies.authService);
  if (isResponseUnavailable(response)) return;
  response.status(200).json(result);
}

async function sendGeneration(
  request: Parameters<RequestHandler>[0],
  response: Parameters<RequestHandler>[1],
  dependencies: ControllerDependencies,
): Promise<void> {
  const session = currentSession(response);
  const processId = parseSummaryProcessId(request.params.id);
  await revalidateSession(session.sessionId, dependencies.authService);
  const result = await dependencies.service.requestGeneration({
    processId, userId: session.userId, sessionId: session.sessionId,
    requestId: (response.locals.requestContext as RequestContext | undefined)?.requestId,
  });
  await revalidateSession(session.sessionId, dependencies.authService);
  if (isResponseUnavailable(response)) return;
  response.status(result.status === 'available' ? 200 : 202).json(result);
}

async function sendFeedback(
  request: Parameters<RequestHandler>[0],
  response: Parameters<RequestHandler>[1],
  dependencies: ControllerDependencies,
): Promise<void> {
  const session = currentSession(response);
  const processId = parseSummaryProcessId(request.params.id);
  const summaryId = parseSummaryId(request.params.summaryId);
  const input = parseSummaryFeedbackBody(request.body);
  await revalidateSession(session.sessionId, dependencies.authService);
  const result = await dependencies.service.saveFeedback({
    ...input, processId, summaryId, userId: session.userId,
    requestId: (response.locals.requestContext as RequestContext | undefined)?.requestId,
  });
  await revalidateSession(session.sessionId, dependencies.authService);
  if (isResponseUnavailable(response)) return;
  response.status(200).json(result);
}

export function createProcessAiSummaryController(
  service: ProcessAiSummaryService,
  authService: AuthService,
): ProcessAiSummaryController {
  const dependencies = { service, authService };
  return {
    read: (request, response) => sendRead(request, response, dependencies),
    requestGeneration: (request, response) => sendGeneration(request, response, dependencies),
    saveFeedback: (request, response) => sendFeedback(request, response, dependencies),
  };
}
