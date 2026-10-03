import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

import type { PrismaClient } from '../generated/prisma/client.js';
import { Prisma } from '../generated/prisma/client.js';
import { createMovementRepository } from './movement-repository.js';
import { createProcessRepository } from './process-repository.js';

dotenv.config({ path: '.env.test', quiet: true });

const databaseUrl = process.env.DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const processData = {
  cnj: 'integration-process-cnj',
  forum: 'Foro de integração',
  court: '1ª Vara Cível',
  lawsuitValue: new Prisma.Decimal('10000.00'),
  numberOfAuthors: 1,
};
let database: PrismaClient | undefined;

integration('persistência de processos e movimentações', () => {
  beforeAll(connectDatabase);
  beforeEach(removeProcessFixture);
  afterAll(disconnectDatabase);

  it('persiste processo, movimentações e sua ordem', persistRelatedMovementsInOrder);
  it('impõe unicidade do CNJ no banco', enforceUniqueCnj);
  it('recusa movimentação sem processo existente', rejectOrphanMovement);
});

async function persistRelatedMovementsInOrder(): Promise<void> {
  const processRepository = createProcessRepository(database!);
  const movementRepository = createMovementRepository(database!);
  const process = await processRepository.create(processData);

  expect(process).toMatchObject({
    cnj: processData.cnj,
    forum: processData.forum,
    court: processData.court,
    numberOfAuthors: processData.numberOfAuthors,
  });
  expect(process.lawsuitValue.toString()).toBe('10000');

  await movementRepository.create(makeMovement(process.id, '2023-12-05', 2));
  await movementRepository.create(makeMovement(process.id, '2023-12-05', 1));
  const movements = await movementRepository.listByProcess(process.id);

  expect(movements.map((movement) => movement.sourceOrder)).toEqual([1, 2]);
  expect(movements.every((movement) => movement.processId === process.id)).toBe(true);
  expect(movements[0]?.movementContent).toBeNull();
}

async function enforceUniqueCnj(): Promise<void> {
  const repository = createProcessRepository(database!);
  await repository.create(processData);

  await expect(repository.create(processData)).rejects.toMatchObject({ code: 'P2002' });
}

async function rejectOrphanMovement(): Promise<void> {
  const repository = createMovementRepository(database!);

  await expect(repository.create(makeMovement(-1, '2023-12-05', 1)))
    .rejects.toMatchObject({ code: 'P2003' });
}

function makeMovement(processId: number, date: string, sourceOrder: number): {
  processId: number;
  movementDate: Date;
  movementTitle: string;
  movementContent: null;
  sourceOrder: number;
} {
  return {
    processId,
    movementDate: new Date(`${date}T00:00:00.000Z`),
    movementTitle: `Movimentação ${sourceOrder}`,
    movementContent: null,
    sourceOrder,
  };
}

async function connectDatabase(): Promise<void> {
  if (!databaseUrl) return;

  const connection = await import('../config/database.js');
  database = connection.prisma;
  await database.$connect();
}

async function removeProcessFixture(): Promise<void> {
  if (database) await database.process.deleteMany({ where: { cnj: processData.cnj } });
}

async function disconnectDatabase(): Promise<void> {
  if (!database) return;

  await removeProcessFixture();
  await database.$disconnect();
}
