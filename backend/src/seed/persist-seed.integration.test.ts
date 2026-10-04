import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

import { parseSeedFile } from './parse-seed-file.js';
import { persistSeed } from './persist-seed.js';
import type { SeedProcess } from '../types/seed.js';
import { createMovementRepository } from '../repositories/movement-repository.js';
import { createProcessRepository } from '../repositories/process-repository.js';
import { createProcessService, type ProcessService } from '../services/process-service.js';

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
const fixturePath = new URL('../../../lawsuits_movements.csv', import.meta.url);
const rollbackCnj = 'seed-rollback-integration-cnj';
let database: import('../generated/prisma/client.js').PrismaClient | undefined;

function getDatabase(): import('../generated/prisma/client.js').PrismaClient {
  if (!database) throw new Error('Banco de integração não foi conectado.');

  return database;
}

describe('persistência do seed CSV', () => {
  beforeAll(connectDatabase);
  afterAll(disconnectDatabase);

  it('persiste e disponibiliza os 100 processos e as 5.568 movimentações', persistFullFixture, 60_000);
  it('reverte todos os registros quando a transação falha', rollbackFailedSeed);
});

async function persistFullFixture(): Promise<void> {
  const connection = getDatabase();
  const data = await parseSeedFile(fixturePath.pathname);
  const cnjs = data.map((process) => process.cnj);
  await connection.process.deleteMany({ where: { cnj: { in: cnjs } } });
  await persistSeed(data, connection);

  const processCount = await connection.process.count({ where: { cnj: { in: cnjs } } });
  const movementCount = await connection.movement.count({ where: { process: { cnj: { in: cnjs } } } });
  const firstCnj = cnjs[0];
  if (!firstCnj) throw new Error('Fixture do CSV não contém processos');

  expect(processCount).toBe(100);
  expect(movementCount).toBe(5568);
  expect(await connection.process.findUnique({ where: { cnj: firstCnj } })).not.toBeNull();

  await verifyImportedFixture(data, connection);
}

async function verifyImportedFixture(
  data: SeedProcess[],
  connection: import('../generated/prisma/client.js').PrismaClient,
): Promise<void> {
  const service = createProcessService(
    createProcessRepository(connection),
    createMovementRepository(connection),
  );
  const movementOwners = await connection.movement.findMany({
    where: { process: { cnj: { in: data.map((process) => process.cnj) } } },
    select: { id: true, processId: true },
  });
  const processRecords = await connection.process.findMany({
    where: { cnj: { in: data.map((process) => process.cnj) } },
    select: { id: true, cnj: true },
  });
  const ownerByMovementId = new Map(movementOwners.map((movement) => [movement.id, movement.processId]));
  const processIdByCnj = new Map(processRecords.map((process) => [process.cnj, process.id]));
  const context = { service, processIdByCnj, ownerByMovementId };

  await verifyProcessDetails(data, service, processIdByCnj);
  const audit = await verifyAllMovementPages(data, context);
  verifyFixtureExtremes(data, audit);
}

async function verifyProcessDetails(
  data: SeedProcess[],
  service: ProcessService,
  processIdByCnj: Map<string, number>,
): Promise<void> {
  for (const expected of data) {
    const processId = processIdByCnj.get(expected.cnj);
    if (!processId) throw new Error(`Processo ${expected.cnj} não foi persistido`);
    const details = await service.getById(processId);

    expect(details).toMatchObject({
      id: processId,
      cnj: expected.cnj,
      forum: expected.forum,
      court: expected.court,
      lawsuitValue: formatExpectedValue(expected.lawsuitValue),
      numberOfAuthors: expected.numberOfAuthors,
    });
  }
}

type MovementAudit = {
  total: number;
  emptyContents: number;
  longestContent: number;
  largestHistory: number;
  ids: Set<number>;
};
type FixtureReadContext = {
  service: ProcessService;
  processIdByCnj: Map<string, number>;
  ownerByMovementId: Map<number, number>;
};

async function verifyAllMovementPages(data: SeedProcess[], context: FixtureReadContext): Promise<MovementAudit> {
  const audit: MovementAudit = { total: 0, emptyContents: 0, longestContent: 0, largestHistory: 0, ids: new Set() };

  for (const process of data) {
    const processId = context.processIdByCnj.get(process.cnj);
    if (!processId) throw new Error(`Processo ${process.cnj} não foi persistido`);
    const expected = [...process.movements].sort(compareExpectedMovements);
    audit.largestHistory = Math.max(audit.largestHistory, expected.length);
    const totalPages = Math.ceil(expected.length / 20);

    for (let page = 1; page <= totalPages; page += 1) {
      const result = await context.service.listMovements({ id: String(processId), query: { page: String(page) } });
      const expectedItems = expected.slice((page - 1) * 20, page * 20).map(toExpectedMovement);

      expect(result).toMatchObject({
        processId, page, pageSize: 20, total: expected.length, totalPages, items: expectedItems,
      });
      accountForReturnedMovements(result.items, processId, { ownerByMovementId: context.ownerByMovementId, audit });
    }
  }

  return audit;
}

function accountForReturnedMovements(
  items: { id: number; movementContent: string | null }[],
  processId: number,
  context: { ownerByMovementId: Map<number, number>; audit: MovementAudit },
): void {
  for (const item of items) {
    expect(context.ownerByMovementId.get(item.id)).toBe(processId);
    expect(context.audit.ids.has(item.id)).toBe(false);
    context.audit.ids.add(item.id);
    context.audit.total += 1;
    if (item.movementContent === null) context.audit.emptyContents += 1;
    context.audit.longestContent = Math.max(context.audit.longestContent, item.movementContent?.length ?? 0);
  }
}

function verifyFixtureExtremes(data: SeedProcess[], audit: MovementAudit): void {
  const fixtureTotal = data.reduce((total, process) => total + process.movements.length, 0);
  const fixtureEmptyContents = data.flatMap((process) => process.movements)
    .filter((movement) => movement.movementContent === null).length;

  expect(audit.total).toBe(fixtureTotal);
  expect(audit.total).toBe(5568);
  expect(audit.ids.size).toBe(audit.total);
  expect(audit.emptyContents).toBe(fixtureEmptyContents);
  expect(audit.emptyContents).toBe(1312);
  expect(audit.largestHistory).toBe(120);
  expect(audit.longestContent).toBe(15266);
}

function compareExpectedMovements(first: SeedProcess['movements'][number], second: SeedProcess['movements'][number]): number {
  const dateOrder = second.movementDate.getTime() - first.movementDate.getTime();
  return dateOrder === 0 ? first.sourceOrder - second.sourceOrder : dateOrder;
}

function toExpectedMovement(movement: SeedProcess['movements'][number]): {
  movementDate: string;
  movementTitle: string | null;
  movementContent: string | null;
} {
  return {
    movementDate: new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(movement.movementDate),
    movementTitle: movement.movementTitle.trim() ? movement.movementTitle : null,
    movementContent: movement.movementContent?.trim() ? movement.movementContent : null,
  };
}

function formatExpectedValue(value: string): string {
  const [integerPart, decimalPart = ''] = value.split('.');
  if (!integerPart) throw new Error('Fixture contém valor de processo inválido');

  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${groupedInteger},${decimalPart.padEnd(2, '0')}`;
}

async function rollbackFailedSeed(): Promise<void> {
  const connection = getDatabase();
  await connection.process.deleteMany({ where: { cnj: rollbackCnj } });
  const data = [makeRollbackProcess(), makeRollbackProcess()];

  await expect(persistSeed(data, connection)).rejects.toMatchObject({ code: 'P2002' });
  expect(await connection.process.count({ where: { cnj: rollbackCnj } })).toBe(0);
  expect(await connection.movement.count({ where: { process: { cnj: rollbackCnj } } })).toBe(0);
}

function makeRollbackProcess(): SeedProcess {
  return {
    cnj: rollbackCnj,
    forum: 'Foro de teste',
    court: '1ª Vara Cível',
    lawsuitValue: '10.00',
    numberOfAuthors: 1,
    movements: [{
      movementDate: new Date('2023-12-05T00:00:00.000Z'),
      movementTitle: 'Movimentação de teste',
      movementContent: null,
      sourceOrder: 1,
    }],
  };
}

async function connectDatabase(): Promise<void> {
  if (!databaseUrl) return;

  const connection = await import('../config/database.js');
  database = connection.prisma;
  await database.$connect();
}

async function disconnectDatabase(): Promise<void> {
  if (!database) return;

  const data = await parseSeedFile(fixturePath.pathname);
  await database.process.deleteMany({ where: { cnj: { in: data.map((process) => process.cnj) } } });
  await database.process.deleteMany({ where: { cnj: rollbackCnj } });
  await database.$disconnect();
}
