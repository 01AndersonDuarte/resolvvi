import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Movement } from '../generated/prisma/client.js';
import { createDatabaseClient } from '../config/database-client.js';
import {
  connectDatabase, createFixture, database, databaseUrl, disconnectDatabase, processId,
} from './process-ai-summary-test-fixture.integration.test.js';

describe('process AI summary source locking', () => {
  beforeAll(connectDatabase);
  beforeEach(createFixture);
  afterAll(disconnectDatabase);

  it('blocks direct movement updates while a source lock is held', blocksDirectMovementWrites);
});

async function blocksDirectMovementWrites(): Promise<void> {
  const movement = await createMovement(1, 'Petição juntada');
  const sourceLock = holdSourceLock();
  const secondClient = createDatabaseClient(databaseUrl!);
  try {
    await sourceLock.acquired;
    await expect(updateMovementDirectly(secondClient, movement.id)).rejects.toMatchObject({ code: 'P2010' });
  } finally {
    sourceLock.release();
    await sourceLock.transaction;
    await secondClient.$disconnect();
  }
  await database!.movement.update({ where: { id: movement.id }, data: { movementTitle: 'SQL liberado' } });
  expect((await database!.movement.findUnique({ where: { id: movement.id } }))?.movementTitle).toBe('SQL liberado');
}

async function createMovement(sourceOrder: number, title: string): Promise<Movement> {
  return database!.movement.create({
    data: { processId, movementDate: new Date('2026-09-01T00:00:00Z'), sourceOrder, movementTitle: title },
  });
}

function holdSourceLock(): { acquired: Promise<void>; release: () => void; transaction: Promise<unknown> } {
  let release: () => void = () => undefined;
  let announceAcquired: () => void = () => undefined;
  const acquired = new Promise<void>((resolve) => { announceAcquired = resolve; });
  const waitForRelease = new Promise<void>((resolve) => { release = resolve; });
  const transaction = database!.$transaction(async (transactionClient) => {
    await transactionClient.$executeRaw`LOCK TABLE "Movement" IN SHARE MODE`;
    announceAcquired();
    await waitForRelease;
  });
  return { acquired, release, transaction };
}

async function updateMovementDirectly(
  databaseClient: ReturnType<typeof createDatabaseClient>,
  movementId: number,
): Promise<number> {
  return databaseClient.$transaction(async (transactionClient) => {
    await transactionClient.$queryRaw`SELECT set_config('lock_timeout', '50ms', true)`;
    return transactionClient.$executeRaw`UPDATE "Movement" SET "movementTitle" = 'SQL direto' WHERE "id" = ${movementId}`;
  });
}
