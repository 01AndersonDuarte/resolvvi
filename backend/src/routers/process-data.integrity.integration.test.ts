import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

import type { PrismaClient } from '../generated/prisma/client.js';
import { createApp } from '../app.js';
import { createProcessRepository } from '../repositories/process-repository.js';
import type { AuthService, SessionContext } from '../types/auth.js';
import type { ProcessRepository } from '../types/process.js';
import { createProcessRouter } from './process-router.js';

const PUBLIC_APP_URL = 'http://localhost:5173';
const PROCESS_CNJ = '0000001-01.2025.8.26.9001';
const ABSENT_CNJ = '9999999-99.2026.8.99.9999';
const session: SessionContext = {
  sessionId: 'session-id', userId: 'user-id', emailVerifiedAt: new Date(),
  expiresAt: '2026-10-04T04:00:00.000Z', serverTime: '2026-10-03T20:00:00.000Z',
};
const authService = { getSession: () => Promise.resolve(session) } as unknown as AuthService;
dotenv.config({ path: '.env.test', quiet: true });
const databaseUrl = process.env.DATABASE_URL;
if (
  process.env.NODE_ENV !== 'test' ||
  !databaseUrl ||
  !new URL(databaseUrl).pathname.includes('_test') ||
  !process.env.DATABASE_LABEL?.endsWith('_test')
) {
  throw new Error('Testes de integração exigem NODE_ENV=test e DATABASE_LABEL isolado com sufixo _test.');
}
let database: PrismaClient | undefined;
let processId = 0;

describe('integridade da base processual nas consultas', () => {
  beforeAll(connectDatabase);
  beforeEach(createFixture);
  afterAll(disconnectDatabase);

  it('mantém processos e movimentações inalterados após sucesso, ausência e formato inválido', verifyReadOnlyQueries);
});

async function verifyReadOnlyQueries(): Promise<void> {
  const client = database;
  if (!client) throw new Error('Banco de teste não conectado.');
  const before = await snapshotProcessData();
  const router = createProcessRouter({
    authService,
    processRepository: createProcessRepository(client),
    cookie: { name: 'session', secure: false },
  });
  const app = createApp({ processRouter: router, publicAppUrl: PUBLIC_APP_URL });

  const found = await request(app).post('/api/processes/search')
    .set('Origin', PUBLIC_APP_URL).send({ cnj: '00000010120258269001' });
  const absent = await request(app).post('/api/processes/search')
    .set('Origin', PUBLIC_APP_URL).send({ cnj: ABSENT_CNJ });
  const malformed = await request(app).post('/api/processes/search')
    .set('Origin', PUBLIC_APP_URL).send({ cnj: '0000001-01.2025.8.26.900' });
  const failed = await request(createFailureApp(client)).post('/api/processes/search')
    .set('Origin', PUBLIC_APP_URL).send({ cnj: PROCESS_CNJ });
  const destination = await request(app).get(`/api/processes/${processId}`);
  const after = await snapshotProcessData();

  expect(found.status).toBe(200);
  expect(found.body).toEqual({ id: processId, cnj: PROCESS_CNJ });
  expect(absent.status).toBe(404);
  expect((absent.body as { error: { code: string } }).error.code).toBe('PROCESS_NOT_FOUND');
  expect(malformed.status).toBe(400);
  expect(failed.status).toBe(503);
  expect(destination.status).toBe(200);
  expect(destination.body).toEqual({ id: processId, cnj: PROCESS_CNJ });
  expect(after).toBe(before);
}

function createFailureApp(client: PrismaClient): ReturnType<typeof createApp> {
  const repository = createProcessRepository(client);
  const failingRepository: ProcessRepository = {
    ...repository,
    findSummaryByCnj: () => Promise.reject(new Error('database unavailable')),
  };
  const processRouter = createProcessRouter({
    authService, processRepository: failingRepository, cookie: { name: 'session', secure: false },
  });

  return createApp({ processRouter, publicAppUrl: PUBLIC_APP_URL });
}

async function createFixture(): Promise<void> {
  if (!database) throw new Error('Banco de teste não conectado.');
  await removeFixture();
  const process = await database.process.create({
    data: {
      cnj: PROCESS_CNJ,
      forum: 'Foro de integridade',
      court: 'Vara de integridade',
      lawsuitValue: '123.45',
      numberOfAuthors: 1,
      movements: {
        create: [{
          movementDate: new Date('2025-01-02T00:00:00.000Z'),
          movementTitle: 'Movimentação de fixture',
          movementContent: 'Conteúdo preservado',
          sourceOrder: 1,
        }],
      },
    },
  });
  processId = process.id;
}

async function removeFixture(): Promise<void> {
  if (!database) return;
  await database.process.deleteMany({ where: { cnj: PROCESS_CNJ } });
}

async function snapshotProcessData(): Promise<string> {
  if (!database) throw new Error('Banco de teste não conectado.');
  const rows = await database.process.findMany({
    include: { movements: { orderBy: [{ movementDate: 'asc' }, { sourceOrder: 'asc' }] } },
    orderBy: { id: 'asc' },
  });
  return JSON.stringify(rows);
}

async function connectDatabase(): Promise<void> {
  const connection = await import('../config/database.js');
  database = connection.prisma;
  await database.$connect();
}

async function disconnectDatabase(): Promise<void> {
  if (!database) return;
  await removeFixture();
  await database.$disconnect();
}
