import request from 'supertest';
import type { Response } from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { ApplicationError } from '../errors/application-error.js';
import type { AuthService, SessionContext } from '../types/auth.js';
import type { ProcessAiSummaryServiceContract } from '../types/process-ai-summary.js';
import { createProcessAiSummaryRouter } from './process-ai-summary-router.js';

const ORIGIN = 'https://app.example.test';
const COOKIE = 'session=valid-secret';
const session: SessionContext = {
  sessionId: '752a061e-31b0-44c4-bf41-c83e72670ea1',
  userId: '8c24a0b8-9c22-4969-9a7a-c289564f8ee2',
  expiresAt: '2026-10-04T13:00:00.000Z',
  serverTime: '2026-10-04T12:00:00.000Z',
};
const authService = {
  getSession: vi.fn(),
  getSessionById: vi.fn(),
} as unknown as AuthService;
const service = {
  read: vi.fn(),
  requestGeneration: vi.fn(),
  saveFeedback: vi.fn(),
} as unknown as ProcessAiSummaryServiceContract;
const app = createApp({
  processAiSummaryRouter: createProcessAiSummaryRouter({
    authService, service, cookie: { name: 'session', secure: false },
  }),
  publicAppUrl: ORIGIN,
});

describe('process AI summary HTTP routes', summaryRouteCases);

function summaryRouteCases(): void {
  beforeEach(() => {
    vi.mocked(authService.getSession).mockReset().mockResolvedValue(session);
    vi.mocked(authService.getSessionById).mockReset().mockResolvedValue(session);
    vi.mocked(service.read).mockReset().mockResolvedValue({
      processId: 42, status: 'not_generated', summary: null, attempt: null, message: null,
      failureCode: null, action: 'generate', serverTime: session.serverTime,
    });
    vi.mocked(service.requestGeneration).mockReset().mockResolvedValue({
      processId: 42, status: 'generating', summary: null, attempt: null, message: 'Gerando resumo…',
      failureCode: null, action: 'none', serverTime: session.serverTime,
    });
    vi.mocked(service.saveFeedback).mockReset().mockResolvedValue({
      outcome: 'created', feedback: { helpful: true, createdAt: session.serverTime, updatedAt: session.serverTime },
    });
  });

  it('protects GET, returns current process state, and validates the session before responding', readsSummary);
  it('rejects extra query keys and invalid attempt IDs', rejectsInvalidQueries);
  it('accepts an empty POST and never accepts a client supplied source', requestsGeneration);
  it('derives feedback identity from the session and rejects coerced or extra fields', savesFeedback);
  it('applies origin and authentication guards before application work', enforcesRequestGuards);
}

async function readsSummary(): Promise<void> {
  const response = await request(app).get('/api/processes/42/ai-summary').set('Cookie', COOKIE);

  expect(response.status).toBe(200);
  expect(service.read).toHaveBeenCalledWith({ processId: 42, userId: session.userId, requestId: requestId(response) });
  expect(authService.getSessionById).toHaveBeenCalledWith(session.sessionId);
  expect(authService.getSession).toHaveBeenCalledOnce();
}

async function rejectsInvalidQueries(): Promise<void> {
  const unknown = await request(app).get('/api/processes/42/ai-summary?page=1').set('Cookie', COOKIE);
  const invalidAttempt = await request(app).get('/api/processes/42/ai-summary?attemptId=bad').set('Cookie', COOKIE);

  expect(unknown.status).toBe(400);
  expect(invalidAttempt.status).toBe(400);
  expect(service.read).not.toHaveBeenCalled();
}

async function requestsGeneration(): Promise<void> {
  const invalid = await request(app).post('/api/processes/42/ai-summary/generations')
    .set('Origin', ORIGIN).set('Cookie', COOKIE).send({ history: ['spoofed'] });
  const response = await request(app).post('/api/processes/42/ai-summary/generations')
    .set('Origin', ORIGIN).set('Cookie', COOKIE).send({});

  expect(invalid.status).toBe(400);
  expect(response.status).toBe(202);
  expect(service.requestGeneration).toHaveBeenCalledWith({
    processId: 42, userId: session.userId, sessionId: session.sessionId,
    requestId: requestId(response),
  });
  expect(authService.getSessionById).toHaveBeenCalledTimes(2);
}

async function savesFeedback(): Promise<void> {
  const invalid = await request(app).post('/api/processes/42/ai-summary/752a061e-31b0-44c4-bf41-c83e72670ea1/feedback')
    .set('Origin', ORIGIN).set('Cookie', COOKIE).send({ helpful: 'true' });
  const response = await request(app).post('/api/processes/42/ai-summary/752a061e-31b0-44c4-bf41-c83e72670ea1/feedback')
    .set('Origin', ORIGIN).set('Cookie', COOKIE).send({ helpful: true });

  expect(invalid.status).toBe(400);
  expect(response.status).toBe(200);
  expect(service.saveFeedback).toHaveBeenCalledWith({
    processId: 42,
    summaryId: '752a061e-31b0-44c4-bf41-c83e72670ea1',
    userId: session.userId,
    helpful: true,
    requestId: requestId(response),
  });
}

function requestId(response: Response): string {
  const value = response.headers['x-request-id'];
  if (typeof value !== 'string') throw new Error('Expected a response request ID.');
  return value;
}

async function enforcesRequestGuards(): Promise<void> {
  const rejectedOrigin = await request(app).post('/api/processes/42/ai-summary/generations').send({});
  vi.mocked(authService.getSession).mockRejectedValueOnce(new ApplicationError({
    code: 'SESSION_INVALID', message: 'Sessão inválida.', status: 401,
  }));
  const unauthenticated = await request(app).get('/api/processes/42/ai-summary');

  expect(rejectedOrigin.status).toBe(403);
  expect(unauthenticated.status).toBe(401);
  expect(service.read).not.toHaveBeenCalled();
}
