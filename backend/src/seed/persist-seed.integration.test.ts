import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

import { parseSeedFile } from './parse-seed-file.js';
import { persistSeed } from './persist-seed.js';
import type { SeedProcess } from './seed-data.js';

dotenv.config({ path: '.env.test', quiet: true });

const databaseUrl = process.env.DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const fixturePath = new URL('../../../lawsuits_movements.csv', import.meta.url);
const rollbackCnj = 'seed-rollback-integration-cnj';
let database: import('../generated/prisma/client.js').PrismaClient | undefined;

integration('persistência do seed CSV', () => {
  beforeAll(connectDatabase);
  afterAll(disconnectDatabase);

  it('persiste os processos e as 5.568 movimentações do CSV', persistFullFixture);
  it('reverte todos os registros quando a transação falha', rollbackFailedSeed);
});

async function persistFullFixture(): Promise<void> {
  if (!database) return;

  const data = await parseSeedFile(fixturePath.pathname);
  const cnjs = data.map((process) => process.cnj);
  await database.process.deleteMany({ where: { cnj: { in: cnjs } } });
  await persistSeed(data, database);

  const processCount = await database.process.count({ where: { cnj: { in: cnjs } } });
  const movementCount = await database.movement.count({ where: { process: { cnj: { in: cnjs } } } });
  const firstCnj = cnjs[0];
  if (!firstCnj) throw new Error('Fixture do CSV não contém processos');

  expect(processCount).toBe(100);
  expect(movementCount).toBe(5568);
  expect(await database.process.findUnique({ where: { cnj: firstCnj } })).not.toBeNull();
}

async function rollbackFailedSeed(): Promise<void> {
  if (!database) return;

  await database.process.deleteMany({ where: { cnj: rollbackCnj } });
  const data = [makeRollbackProcess(), makeRollbackProcess()];

  await expect(persistSeed(data, database)).rejects.toMatchObject({ code: 'P2002' });
  expect(await database.process.count({ where: { cnj: rollbackCnj } })).toBe(0);
  expect(await database.movement.count({ where: { process: { cnj: rollbackCnj } } })).toBe(0);
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
