import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthService } from '../types/auth.js';
import type { SessionCookieConfiguration } from '../types/http.js';
import type { ProcessService } from '../services/process-service.js';
import { createProcessController } from './process-controller.js';

const result = { id: 1, cnj: '1002271-82.2025.8.26.0003' };
const processService = {
  search: vi.fn().mockResolvedValue(result), getById: vi.fn().mockResolvedValue(result),
  listMovements: vi.fn().mockResolvedValue({ processId: 1, items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 }),
} as unknown as ProcessService;
const authService = { getSession: vi.fn().mockResolvedValue({}) } as unknown as AuthService;
const cookie: SessionCookieConfiguration = { name: 'session', secure: false };
const controller = createProcessController(processService, authService, cookie);

describe('controller de processos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não serializa resposta após o cliente desconectar', skipDisconnectedResponse);
  it('não serializa resposta depois que o timeout respondeu', skipTimedOutResponse);
  it('não serializa resposta quando o contexto marca timeout', skipExpiredRequestContext);
  it('não serializa detalhes se a sessão expirar durante a leitura', skipDetailsAfterRevocation);
  it('revalida a sessão depois de ler movimentações', skipMovementsAfterRevocation);
});

async function skipDisconnectedResponse(): Promise<void> {
  const response = makeResponse({ destroyed: true });
  await controller.search(makeRequest() as Request, response, vi.fn());

  expect(response.json).not.toHaveBeenCalled();
}

async function skipTimedOutResponse(): Promise<void> {
  const response = makeResponse({ headersSent: true });
  await controller.search(makeRequest() as Request, response, vi.fn());

  expect(response.json).not.toHaveBeenCalled();
}

async function skipExpiredRequestContext(): Promise<void> {
  const response = makeResponse({ timedOut: true });
  await controller.search(makeRequest() as Request, response, vi.fn());

  expect(response.json).not.toHaveBeenCalled();
}

async function skipDetailsAfterRevocation(): Promise<void> {
  vi.mocked(authService.getSession).mockReset().mockRejectedValue(new Error('session revoked'));
  const response = makeResponse({});

  await expect(controller.getById(makeDetailsRequest() as Request, response, vi.fn())).rejects.toThrow('session revoked');
  expect(authService.getSession).toHaveBeenCalledTimes(1);
  expect(response.json).not.toHaveBeenCalled();
}

async function skipMovementsAfterRevocation(): Promise<void> {
  vi.mocked(authService.getSession).mockReset().mockRejectedValue(new Error('session revoked'));
  const response = makeResponse({});

  await expect(controller.getMovements(makeMovementsRequest() as Request, response, vi.fn()))
    .rejects.toThrow('session revoked');
  expect(processService.listMovements).toHaveBeenCalledWith({ id: '1', query: {} });
  expect(response.json).not.toHaveBeenCalled();
}

function makeRequest(): Partial<Request> {
  return { body: { cnj: result.cnj }, headers: { cookie: 'session=secret' } };
}

function makeDetailsRequest(): Partial<Request> {
  return { params: { id: '1' }, headers: { cookie: 'session=secret' } };
}

function makeMovementsRequest(): Partial<Request> {
  return { params: { id: '1' }, query: {}, headers: { cookie: 'session=secret' } };
}

function makeResponse(options: { destroyed?: boolean; headersSent?: boolean; timedOut?: boolean }): Response & {
  json: ReturnType<typeof vi.fn>;
} {
  const response = {
    destroyed: options.destroyed ?? false,
    headersSent: options.headersSent ?? false,
    locals: { requestContext: { timedOut: options.timedOut ?? false } },
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  return response as unknown as Response & { json: ReturnType<typeof vi.fn> };
}
