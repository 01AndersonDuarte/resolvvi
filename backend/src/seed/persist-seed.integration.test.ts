import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

import { parseSeedFile } from './parse-seed-file.js';
import { persistSeed } from './persist-seed.js';
import type { SeedProcess } from '../types/seed.js';

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

  it('persiste os processos e as 5.568 movimentações do CSV', persistFullFixture);
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
