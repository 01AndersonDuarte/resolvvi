import { performance } from 'node:perf_hooks';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

import type { PrismaClient } from '../generated/prisma/client.js';
import { createApp } from '../app.js';
import { createMovementRepository } from '../repositories/movement-repository.js';
import { createProcessRepository } from '../repositories/process-repository.js';
import type { AuthService, SessionContext } from '../types/auth.js';
import { createProcessRouter } from './process-router.js';

const PUBLIC_APP_URL = 'http://localhost:5173';
const PROCESS_CNJ = '0000002-02.2025.8.26.9001';
const ABSENT_ID = 2_147_483_647;
const EVENT_COUNT = 1_000;
const PAGE_COUNT = 50;
const session: SessionContext = {
  sessionId: 'movement-session', userId: 'movement-user',
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
type MovementResponse = {
  processId: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: { id: number }[];
};

describe('paginação de movimentações no banco isolado', () => {
  beforeAll(connectDatabase);
  beforeEach(createFixture);
  afterAll(disconnectDatabase);

  it('percorre 1.000 eventos em 50 páginas sem perda, duplicação ou mistura', verifyAllPages);
  it('distingue processo ausente e rejeita página excedente sem leitura ilimitada', verifyBounds);
});

async function verifyAllPages(): Promise<void> {
  const client = database;
  if (!client) throw new Error('Banco de teste não conectado.');
  const app = createApp({
    processRouter: createProcessRouter({
      authService,
      processRepository: createProcessRepository(client),
      movementRepository: createMovementRepository(client),
      cookie: { name: 'session', secure: false },
    }),
    publicAppUrl: PUBLIC_APP_URL,
  });
  const { receivedIds, responseBytes, elapsedMilliseconds } = await collectPages(app);
  expect(receivedIds).toHaveLength(EVENT_COUNT);
  expect(new Set(receivedIds).size).toBe(EVENT_COUNT);
  expect(receivedIds).toEqual(await expectedMovementIds(client));
  expect(responseBytes).toBeGreaterThan(0);
  process.stderr.write(JSON.stringify({
    integration: 'TI-02', node: process.version, database: 'isolated PostgreSQL',
    eventCount: EVENT_COUNT, pageCount: PAGE_COUNT, responseBytes,
    elapsedMilliseconds: Number(elapsedMilliseconds.toFixed(2)),
  }) + '\n');
}

async function collectPages(app: ReturnType<typeof createApp>): Promise<{
  receivedIds: number[]; responseBytes: number; elapsedMilliseconds: number;
}> {
  const receivedIds: number[] = [];
  let responseBytes = 0;
  const elapsedStarted = performance.now();
  for (let page = 1; page <= PAGE_COUNT; page += 1) {
    const response = await request(app).get(`/api/processes/${processId}/movements?page=${page}`);
    const body = response.body as MovementResponse;
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ processId, page, pageSize: 20, total: EVENT_COUNT, totalPages: PAGE_COUNT });
    expect(body.items).toHaveLength(20);
    receivedIds.push(...body.items.map(({ id }) => id));
    responseBytes += Buffer.byteLength(JSON.stringify(body));
  }
  return { receivedIds, responseBytes, elapsedMilliseconds: performance.now() - elapsedStarted };
}

async function verifyBounds(): Promise<void> {
  const client = database;
  if (!client) throw new Error('Banco de teste não conectado.');
  const app = createApp({
    processRouter: createProcessRouter({
      authService,
      processRepository: createProcessRepository(client),
      movementRepository: createMovementRepository(client),
      cookie: { name: 'session', secure: false },
    }),
    publicAppUrl: PUBLIC_APP_URL,
  });
  const missing = await request(app).get(`/api/processes/${ABSENT_ID}/movements`);
  const invalidPage = await request(app).get(`/api/processes/${processId}/movements?page=51`);

  expect(missing.status).toBe(404);
  expect((missing.body as { error: { code: string } }).error.code).toBe('PROCESS_NOT_FOUND');
  expect(invalidPage.status).toBe(400);
  expect((invalidPage.body as { error: { code: string } }).error.code).toBe('INVALID_INPUT');
}

async function expectedMovementIds(client: PrismaClient): Promise<number[]> {
  const records = await client.movement.findMany({
    where: { processId },
    select: { id: true, movementDate: true, sourceOrder: true },
  });
  const orderedRecords = records.sort((left, right) => {
    const dateDifference = right.movementDate.getTime() - left.movementDate.getTime();
    return dateDifference || left.sourceOrder - right.sourceOrder || left.id - right.id;
  });
  return orderedRecords.map(({ id }) => id);
}

async function createFixture(): Promise<void> {
  if (!database) throw new Error('Banco de teste não conectado.');
  await removeFixture();
  const process = await database.process.create({
    data: {
      cnj: PROCESS_CNJ, forum: 'Foro de paginação', court: 'Vara de paginação',
      lawsuitValue: '1.00', numberOfAuthors: 1,
    },
  });
  processId = process.id;
  await database.movement.createMany({ data: makeMovements(processId) });
}

function makeMovements(ownerId: number): {
  processId: number; movementDate: Date; movementTitle: string; movementContent: string; sourceOrder: number;
}[] {
  return Array.from({ length: EVENT_COUNT }, (_, index) => ({
    processId: ownerId,
    movementDate: new Date(Date.UTC(2025, 0, 1 + Math.floor(index / 30))),
    movementTitle: `Evento ${index + 1}`,
    movementContent: `Conteúdo integral do evento ${index + 1}`,
    sourceOrder: index + 1,
  }));
}

async function removeFixture(): Promise<void> {
  if (!database) return;
  await database.process.deleteMany({ where: { cnj: PROCESS_CNJ } });
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
