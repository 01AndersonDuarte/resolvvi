import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '../errors/application-error.js';
import { createApp } from '../app.js';
import type { AuthService, SessionContext } from '../types/auth.js';
import type { ProcessRepository } from '../types/process.js';
import { createProcessRouter } from './process-router.js';

const PUBLIC_APP_URL = 'http://localhost:5173';
const COOKIE = 'session=valid-session-secret';
const session = {
  sessionId: 'session-id', userId: 'user-id',
  expiresAt: '2026-10-04T04:00:00.000Z', serverTime: '2026-10-03T20:00:00.000Z',
} as SessionContext;
const getSession = vi.fn<AuthService['getSession']>();
const findSummaryByCnj = vi.fn<ProcessRepository['findSummaryByCnj']>();
const findSummaryById = vi.fn<ProcessRepository['findSummaryById']>();
const processRepository = { create: vi.fn(), findByCnj: vi.fn(), findSummaryByCnj, findSummaryById } as unknown as ProcessRepository;
const authService = { getSession } as unknown as AuthService;
const router = createProcessRouter({
  authService, processRepository, cookie: { name: 'session', secure: false },
});
const app = createApp({ processRouter: router, publicAppUrl: PUBLIC_APP_URL });

describe('rotas protegidas de processos', processRouterCases);

function processRouterCases(): void {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(session);
    findSummaryByCnj.mockReset();
    findSummaryById.mockReset();
  });

  it('autoriza antes de validar o CNJ e não consulta sem sessão', rejectUnauthenticatedInput);
  it('recusa formato inválido antes da busca quando a sessão existe', rejectMalformedCnj);
  it('normaliza formas equivalentes e revalida a sessão antes da resposta', searchEquivalentCnj);
  it('não revela processo se a sessão for revogada durante a busca', hideResultAfterRevocation);
  it('retorna a projeção mínima no destino estável', returnMinimalProcessSummary);
  it('permite leitura do mesmo processo por outra conta autenticada', allowsAnotherAccount);
}

async function rejectMalformedCnj(): Promise<void> {
  const response = await request(app).post('/api/processes/search')
    .set('Origin', PUBLIC_APP_URL).set('Cookie', COOKIE).send({ cnj: '1002271 82.2025.8.26.0003' });

  expect(response.status).toBe(400);
  expect(findSummaryByCnj).not.toHaveBeenCalled();
}

async function rejectUnauthenticatedInput(): Promise<void> {
  getSession.mockRejectedValueOnce(sessionInvalid());
  const response = await request(app).post('/api/processes/search')
    .set('Origin', PUBLIC_APP_URL).send({ cnj: 'bad' });

  const body = response.body as { error: { code: string } };
  expect(response.status).toBe(401);
  expect(body.error.code).toBe('SESSION_INVALID');
  expect(findSummaryByCnj).not.toHaveBeenCalled();
}

async function searchEquivalentCnj(): Promise<void> {
  findSummaryByCnj.mockResolvedValue({ id: 9, cnj: '1002271-82.2025.8.26.0003' });
  const response = await request(app).post('/api/processes/search')
    .set('Origin', PUBLIC_APP_URL).set('Cookie', COOKIE).send({ cnj: '10022718220258260003' });

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ id: 9, cnj: '1002271-82.2025.8.26.0003' });
  expect(findSummaryByCnj).toHaveBeenCalledWith('1002271-82.2025.8.26.0003');
  expect(getSession).toHaveBeenCalledTimes(2);
}

async function hideResultAfterRevocation(): Promise<void> {
  findSummaryByCnj.mockResolvedValue({ id: 9, cnj: '1002271-82.2025.8.26.0003' });
  getSession.mockResolvedValueOnce(session).mockRejectedValueOnce(sessionInvalid());
  const response = await request(app).post('/api/processes/search')
    .set('Origin', PUBLIC_APP_URL).set('Cookie', COOKIE).send({ cnj: '1002271-82.2025.8.26.0003' });

  const body = response.body as { error: { code: string } };
  expect(response.status).toBe(401);
  expect(body.error.code).toBe('SESSION_INVALID');
}

async function returnMinimalProcessSummary(): Promise<void> {
  findSummaryById.mockResolvedValue({ id: 9, cnj: '1002271-82.2025.8.26.0003' });
  const response = await request(app).get('/api/processes/9').set('Cookie', COOKIE);

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ id: 9, cnj: '1002271-82.2025.8.26.0003' });
  expect(findSummaryById).toHaveBeenCalledWith(9);
  expect(getSession).toHaveBeenCalledTimes(2);
}

async function allowsAnotherAccount(): Promise<void> {
  getSession.mockResolvedValue({ ...session, userId: 'other-user-id' });
  findSummaryByCnj.mockResolvedValue({ id: 9, cnj: '1002271-82.2025.8.26.0003' });
  const response = await request(app).post('/api/processes/search')
    .set('Origin', PUBLIC_APP_URL).set('Cookie', 'session=other-session').send({ cnj: '1002271-82.2025.8.26.0003' });

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ id: 9, cnj: '1002271-82.2025.8.26.0003' });
}

function sessionInvalid(): ApplicationError {
  return new ApplicationError({
    code: 'SESSION_INVALID', message: 'Sua sessão não é mais válida.', status: 401,
  });
}
