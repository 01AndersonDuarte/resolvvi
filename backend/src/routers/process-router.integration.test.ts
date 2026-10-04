import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '../generated/prisma/client.js';
import { ApplicationError } from '../errors/application-error.js';
import { createApp } from '../app.js';
import type { AuthService, SessionContext } from '../types/auth.js';
import type { MovementRepository, ProcessRepository } from '../types/process.js';
import { createProcessRouter } from './process-router.js';

const PUBLIC_APP_URL = 'http://localhost:5173';
const COOKIE = 'session=valid-session-secret';
const session = {
  sessionId: 'session-id', userId: 'user-id',
  expiresAt: '2026-10-04T04:00:00.000Z', serverTime: '2026-10-03T20:00:00.000Z',
} as SessionContext;
const getSession = vi.fn<AuthService['getSession']>();
const findSummaryByCnj = vi.fn<ProcessRepository['findSummaryByCnj']>();
const findById = vi.fn<ProcessRepository['findById']>();
const countByProcess = vi.fn<MovementRepository['countByProcess']>();
const listPageByProcess = vi.fn<MovementRepository['listPageByProcess']>();
const processRepository = { create: vi.fn(), findByCnj: vi.fn(), findSummaryByCnj, findById } as unknown as ProcessRepository;
const movementRepository = {
  create: vi.fn(), listByProcess: vi.fn(), countByProcess, listPageByProcess,
} as unknown as MovementRepository;
const authService = { getSession } as unknown as AuthService;
const router = createProcessRouter({
  authService, processRepository, movementRepository, cookie: { name: 'session', secure: false },
});
const app = createApp({ processRouter: router, publicAppUrl: PUBLIC_APP_URL });

describe('rotas protegidas de processos', processRouterCases);

function processRouterCases(): void {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue(session);
    findSummaryByCnj.mockReset();
    findById.mockReset();
    countByProcess.mockReset();
    listPageByProcess.mockReset();
  });

  it('autoriza antes de validar o CNJ e não consulta sem sessão', rejectUnauthenticatedInput);
  it('recusa formato inválido antes da busca quando a sessão existe', rejectMalformedCnj);
  it('normaliza formas equivalentes e revalida a sessão antes da resposta', searchEquivalentCnj);
  it('não revela processo se a sessão for revogada durante a busca', hideResultAfterRevocation);
  it('retorna os dados gerais no destino estável', returnProcessDetails);
  it('distingue identificador inválido de processo válido ausente', distinguishInvalidAndMissingProcess);
  it('permite leitura do mesmo processo por outra conta autenticada', allowsAnotherAccount);
  it('retorna a página ordenada com o contrato fixo', returnMovementPage);
  it('distingue histórico vazio, processo ausente e página inválida', distinguishMovementContracts);
  it('não revela movimentações se a sessão for revogada durante a leitura', hideMovementsAfterRevocation);
  it('bloqueia detalhes e movimentações sem sessão válida', rejectUnauthenticatedReads);
  it('converte indisponibilidade da paginação em envelope público seguro', hideMovementPersistenceFailure);
  it('oculta falha inesperada durante revalidação da sessão', hideUnexpectedMovementFailure);
}

async function returnMovementPage(): Promise<void> {
  findById.mockResolvedValue({ id: 9, cnj: '1002271-82.2025.8.26.0003' } as never);
  countByProcess.mockResolvedValue(1);
  listPageByProcess.mockResolvedValue([{
    id: 31, processId: 9, movementDate: new Date('2025-01-02T00:00:00.000Z'),
    movementTitle: 'Publicação', movementContent: 'Texto integral', sourceOrder: 1,
  }] as never);
  const response = await request(app).get('/api/processes/9/movements?page=1').set('Cookie', COOKIE);

  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    processId: 9,
    items: [{ id: 31, movementDate: '02/01/2025', movementTitle: 'Publicação', movementContent: 'Texto integral' }],
    page: 1, pageSize: 20, total: 1, totalPages: 1,
  });
  expect(listPageByProcess).toHaveBeenCalledWith({ processId: 9, page: 1 });
  expect(getSession).toHaveBeenCalledTimes(2);
}

async function distinguishMovementContracts(): Promise<void> {
  findById.mockResolvedValue({ id: 9, cnj: '1002271-82.2025.8.26.0003' } as never);
  countByProcess.mockResolvedValue(0);
  listPageByProcess.mockResolvedValue([]);
  const empty = await request(app).get('/api/processes/9/movements').set('Cookie', COOKIE);
  const invalidPage = await request(app).get('/api/processes/9/movements?page=0').set('Cookie', COOKIE);
  findById.mockResolvedValue(null);
  const missing = await request(app).get('/api/processes/10/movements').set('Cookie', COOKIE);

  expect(empty.status).toBe(200);
  expect(empty.body).toMatchObject({ items: [], page: 1, total: 0, totalPages: 0 });
  expect(invalidPage.status).toBe(400);
  expect((invalidPage.body as { error: { code: string } }).error.code).toBe('INVALID_INPUT');
  expect(missing.status).toBe(404);
  expect((missing.body as { error: { code: string } }).error.code).toBe('PROCESS_NOT_FOUND');
}

async function hideMovementsAfterRevocation(): Promise<void> {
  findById.mockResolvedValue({ id: 9, cnj: '1002271-82.2025.8.26.0003' } as never);
  countByProcess.mockResolvedValue(0);
  listPageByProcess.mockResolvedValue([]);
  getSession.mockResolvedValueOnce(session).mockRejectedValueOnce(sessionInvalid());
  const response = await request(app).get('/api/processes/9/movements').set('Cookie', COOKIE);

  expect(response.status).toBe(401);
  expect((response.body as { error: { code: string } }).error.code).toBe('SESSION_INVALID');
}

async function rejectUnauthenticatedReads(): Promise<void> {
  getSession.mockRejectedValueOnce(sessionInvalid()).mockRejectedValueOnce(sessionInvalid());
  const details = await request(app).get('/api/processes/9');
  const movements = await request(app).get('/api/processes/9/movements');

  expect(details.status).toBe(401);
  expect(movements.status).toBe(401);
  expect(findById).not.toHaveBeenCalled();
  expect(countByProcess).not.toHaveBeenCalled();
}

async function hideMovementPersistenceFailure(): Promise<void> {
  findById.mockResolvedValue({ id: 9, cnj: '1002271-82.2025.8.26.0003' } as never);
  countByProcess.mockRejectedValue(new Error('private database detail'));
  const response = await request(app).get('/api/processes/9/movements').set('Cookie', COOKIE);
  const body = response.body as { error: { code: string; message: string } };

  expect(response.status).toBe(503);
  expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
  expect(JSON.stringify(body)).not.toContain('private database detail');
}

async function hideUnexpectedMovementFailure(): Promise<void> {
  findById.mockResolvedValue({ id: 9, cnj: '1002271-82.2025.8.26.0003' } as never);
  countByProcess.mockResolvedValue(0);
  listPageByProcess.mockResolvedValue([]);
  getSession.mockResolvedValueOnce(session).mockRejectedValueOnce(new Error('private session detail'));
  const response = await request(app).get('/api/processes/9/movements').set('Cookie', COOKIE);

  expect(response.status).toBe(500);
  expect(JSON.stringify(response.body)).not.toContain('private session detail');
  expect(JSON.stringify(response.body)).not.toContain('stack');
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

async function returnProcessDetails(): Promise<void> {
  findById.mockResolvedValue({
    id: 9,
    cnj: '1002271-82.2025.8.26.0003',
    forum: 'Foro de teste',
    court: '1ª Vara Cível',
    lawsuitValue: new Prisma.Decimal('10168.20'),
    numberOfAuthors: 1,
  });
  const response = await request(app).get('/api/processes/9').set('Cookie', COOKIE);

  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    id: 9,
    cnj: '1002271-82.2025.8.26.0003',
    forum: 'Foro de teste',
    court: '1ª Vara Cível',
    lawsuitValue: '10.168,20',
    numberOfAuthors: 1,
  });
  expect(findById).toHaveBeenCalledWith(9);
  expect(getSession).toHaveBeenCalledTimes(2);
}

async function distinguishInvalidAndMissingProcess(): Promise<void> {
  const invalid = await request(app).get('/api/processes/abc').set('Cookie', COOKIE);
  const missing = await request(app).get('/api/processes/2147483647').set('Cookie', COOKIE);
  const missingBody = missing.body as { error: { code: string } };

  expect(invalid.status).toBe(400);
  expect((invalid.body as { error: { code: string } }).error.code).toBe('INVALID_INPUT');
  expect(findById).toHaveBeenCalledTimes(1);
  expect(missing.status).toBe(404);
  expect(missingBody.error.code).toBe('PROCESS_NOT_FOUND');
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
