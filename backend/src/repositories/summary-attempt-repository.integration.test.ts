import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { reserveProcessSummaryAttempt } from './process-ai-summary-repository.js';
import { finishSummaryAttempt } from './summary-attempt-repository.js';
import type { SummaryReservation } from '../types/process-ai-summary.js';
import {
  connectDatabase, createFixture, database, disconnectDatabase, processId, rulesVersion,
} from './process-ai-summary-test-fixture.integration.test.js';

describe('summary attempt repository', () => {
  beforeAll(connectDatabase);
  beforeEach(createFixture);
  afterAll(disconnectDatabase);

  it('persists a provider cooldown before allowing an explicit retry', persistsProviderCooldown);
});

async function persistsProviderCooldown(): Promise<void> {
  await createMovement();
  const now = new Date('2026-10-04T12:00:00Z');
  const initial = await reserveAttempt(now);
  const retryAt = new Date(now.getTime() + 10_000);
  const finished = await finishSummaryAttempt({
    attemptId: initial.attemptId!, status: 'failed', failureCode: 'provider_unavailable',
    finishedAt: new Date(now.getTime() + 1_000), retryAt,
  }, database!);
  const beforeCooldown = await reserveAttempt(new Date(now.getTime() + 2_000));
  const afterCooldown = await reserveAttempt(new Date(now.getTime() + 11_000));

  expect(finished).toBe(true);
  expect(beforeCooldown).toMatchObject({ outcome: 'cooldown', retryAt });
  expect(afterCooldown).toMatchObject({ outcome: 'created', attemptNumber: 2 });
}

async function createMovement(): Promise<void> {
  await database!.movement.create({
    data: { processId, movementDate: new Date('2026-09-01T00:00:00Z'), sourceOrder: 1, movementTitle: 'Petição juntada' },
  });
}

async function reserveAttempt(now: Date): Promise<SummaryReservation> {
  return reserveProcessSummaryAttempt({
    processId, rulesVersion, configuration: { provider: 'fake', model: 'test' },
    configurationHash: 'a'.repeat(64), now, deadlineAt: new Date(now.getTime() + 30_000), retryAt: now,
  }, database!);
}
