import dotenv from 'dotenv';
import { expect, it } from 'vitest';
import type { PrismaClient } from '../generated/prisma/client.js';
import { Prisma } from '../generated/prisma/client.js';

dotenv.config({ path: '.env.test', quiet: true });

export const databaseUrl = process.env.DATABASE_URL;
export const rulesVersion = 'summary-rules-v1';
export const processData = {
  cnj: 'summary-repository-integration-cnj', forum: 'Foro de integração', court: 'Vara de teste',
  lawsuitValue: new Prisma.Decimal('100.00'), numberOfAuthors: 1,
};
export let database: PrismaClient | undefined;
export let processId = 0;
export let userId = '';

assertIsolatedDatabase();

it('uses a dedicated isolated database label', () => {
  expect(process.env.DATABASE_LABEL?.endsWith('_test')).toBe(true);
});

export async function createFixture(): Promise<void> {
  await removeFixture();
  const processRecord = await database!.process.create({ data: processData });
  processId = processRecord.id;
  const user = await database!.user.create({ data: { email: 'summary-repository@example.test', passwordHash: 'test-hash' } });
  userId = user.id;
}

export async function removeFixture(): Promise<void> {
  if (!database || !processId) return;
  const summaries = await database.processAiSummary.findMany({ where: { processId }, select: { id: true } });
  await database.summaryFeedbackRecord.deleteMany({ where: { summaryId: { in: summaries.map((item) => item.id) } } });
  await database.processAiSummary.deleteMany({ where: { processId } });
  const slots = await database.summaryGenerationSlot.findMany({ where: { processId }, select: { id: true } });
  await database.summaryAttempt.deleteMany({ where: { slotId: { in: slots.map((item) => item.id) } } });
  await database.summaryGenerationSlot.deleteMany({ where: { processId } });
  await database.summarySourceState.deleteMany({ where: { processId } });
  await database.movement.deleteMany({ where: { processId } });
  await database.process.deleteMany({ where: { id: processId } });
  await database.process.deleteMany({ where: { cnj: `${processData.cnj}-other` } });
  if (userId) await database.user.deleteMany({ where: { id: userId } });
}

export async function connectDatabase(): Promise<void> {
  const connection = await import('../config/database.js');
  database = connection.prisma;
  await database.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  if (!database) return;
  await removeFixture();
  await database.$disconnect();
}

function assertIsolatedDatabase(): void {
  if (process.env.NODE_ENV !== 'test' || !databaseUrl || !new URL(databaseUrl).pathname.includes('_test') ||
    !process.env.DATABASE_LABEL?.endsWith('_test')) {
    throw new Error('Summary repository integration tests require an isolated test database.');
  }
}
