import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Movement, Prisma, PrismaClient } from '../generated/prisma/client.js';
import { createDatabaseClient } from '../config/database-client.js';
import {
  observeProcessSummarySource, publishProcessAiSummary, readCurrentProcessAiSummary, reserveProcessSummaryAttempt,
} from './process-ai-summary-repository.js';
import { markSummaryAttemptDispatched } from './summary-attempt-repository.js';
import { getSummaryFeedbackMetrics, saveSummaryFeedback } from './summary-feedback-repository.js';
import type { SaveSummaryFeedbackResult } from './summary-feedback-repository.js';
import type { SummaryReservation } from '../types/process-ai-summary.js';
import {
  connectDatabase, createFixture, database, databaseUrl, disconnectDatabase, processData, processId,
  rulesVersion, userId,
} from './process-ai-summary-test-fixture.integration.test.js';

describe('process AI summary repository', () => {
  beforeAll(connectDatabase);
  beforeEach(createFixture);
  afterAll(disconnectDatabase);

  it('observes source edits with a new revision and stable tie ordering', observesSourceEdits);
  it('serializes concurrent reservations and stores one complete source snapshot', serializesReservations);
  it('publishes atomically, records idempotent votes, and preserves old evidence', preservesPublishedEvidence);
  it('reuses a valid summary when only the provider configuration changes', reusesSummaryAcrossProviderChange);
  it('rejects publication after a source edit and dispatches an attempt once', rejectsStalePublication);
  it('persists attempts across a client restart and never reuses an expired attempt', persistsAttemptsAcrossRestart);
  it('does not reactivate a summary when the observed source is reverted', doesNotReactivateRevertedSource);
  it('rolls back summary and attempt state when publication violates a database constraint', rollsBackFailedPublication);
});

async function observesSourceEdits(): Promise<void> {
  const firstMovement = await createMovement(2, 'segunda');
  await createMovement(1, 'primeira');
  const first = await observeProcessSummarySource(processId, database!);
  let expectedRevision = await updateMovementFields(firstMovement.id);
  await createMovement(4, 'Movimentação adicionada');
  expectedRevision += 1;
  expect((await observeProcessSummarySource(processId, database!))?.sourceRevision).toBe(expectedRevision);
  const otherProcess = await database!.process.create({ data: { ...processData, cnj: `${processData.cnj}-other` } });
  expectedRevision += 1;
  await reassignMovementAndObserve(firstMovement.id, otherProcess.id, expectedRevision);
  expectedRevision += 1;
  await reassignMovementAndObserve(firstMovement.id, processId, expectedRevision);
  await database!.movement.delete({ where: { id: firstMovement.id } });
  expectedRevision += 1;
  const second = await observeProcessSummarySource(processId, database!);

  expect(first?.source.movements.map((item) => item.sourceOrder)).toEqual([1, 2]);
  expect(second?.sourceRevision).toBe(expectedRevision);
  expect(second?.source.sourceHash).not.toBe(first?.source.sourceHash);
}

async function updateMovementFields(movementId: number): Promise<number> {
  const changes = [
    { movementTitle: 'Título alterado' },
    { movementContent: 'Conteúdo alterado' },
    { movementDate: new Date('2026-09-02T00:00:00Z') },
    { sourceOrder: 3 },
  ];
  let expectedRevision = 1;
  for (const data of changes) {
    expectedRevision += 1;
    await updateMovementAndObserve(movementId, data, expectedRevision);
  }
  return expectedRevision;
}

async function reassignMovementAndObserve(movementId: number, targetProcessId: number, revision: number): Promise<void> {
  await updateMovementAndObserve(movementId, { processId: targetProcessId }, revision);
}

async function updateMovementAndObserve(
  movementId: number,
  data: Prisma.MovementUncheckedUpdateInput,
  revision: number,
): Promise<void> {
  await database!.movement.update({ where: { id: movementId }, data });
  expect((await observeProcessSummarySource(processId, database!))?.sourceRevision).toBe(revision);
}

async function serializesReservations(): Promise<void> {
  await createMovement(1, 'Petição juntada');
  const now = new Date('2026-10-04T12:00:00Z');
  const secondClient = createDatabaseClient(databaseUrl!);
  let results: SummaryReservation[];
  try {
    results = await Promise.all([reserve(now), reserve(now, secondClient)]);
  } finally {
    await secondClient.$disconnect();
  }
  const slot = await database!.summaryGenerationSlot.findFirst({ where: { processId } });
  const attempts = await database!.summaryAttempt.findMany({ where: { slotId: slot!.id } });

  expect(results.map((result) => result.outcome).sort()).toEqual(['created', 'joined']);
  expect(attempts).toHaveLength(1);
  const snapshot = slot?.sourceSnapshot as { title: string; movementId: number }[] | undefined;
  expect(snapshot?.[0]?.title).toBe('Petição juntada');
  expect(snapshot?.[0]?.movementId).toEqual(expect.any(Number));
}

async function preservesPublishedEvidence(): Promise<void> {
  await createMovement(1, 'Petição juntada');
  const now = new Date('2026-10-04T12:00:00Z');
  const reservation = await reserve(now);
  expect(reservation.attemptId).not.toBeNull();
  const published = await publishProcessAiSummary({
    processId, slotId: reservation.slotId!, attemptId: reservation.attemptId!, rulesVersion,
    paragraphs: ['Foi juntada uma petição.'],
    claims: [{ paragraphIndex: 0, sentenceIndex: 0, text: 'Foi juntada uma petição.', sourceRefs: ['m1'] }],
    now: new Date(now.getTime() + 1_000), deadlineAt: new Date(now.getTime() + 30_000), usage: null, providerRequestId: null,
  }, database!);
  expect(published?.version).toBe(1);
  expect((await readCurrentProcessAiSummary({ processId, rulesVersion, userId }, database!))?.summary)
    .toMatchObject({ id: published!.id, version: 1, myFeedback: null });

  await assertFeedbackLifecycle(published!.id, now);
  await database!.movement.deleteMany({ where: { processId } });
  const sourceAfterRemoval = await observeProcessSummarySource(processId, database!);
  const snapshot = await database!.summaryGenerationSlot.findUnique({ where: { id: reservation.slotId! } });

  expect(sourceAfterRemoval?.sourceRevision).toBe(2);
  expect(snapshot?.sourceSnapshot).toMatchObject([{ title: 'Petição juntada' }]);
}

async function assertFeedbackLifecycle(summaryId: string, now: Date): Promise<void> {
  await assertFeedbackMetrics(summaryId, 0, 0);
  const first = await saveFeedback(summaryId, true, new Date(now.getTime() + 2_000));
  const repeated = await saveFeedback(summaryId, true, new Date(now.getTime() + 3_000));
  const changed = await saveFeedback(summaryId, false, new Date(now.getTime() + 4_000));
  await assertFeedbackMetrics(summaryId, 1, 0);
  const concurrentVotes = await recordConcurrentVotes(summaryId, now);

  expect([first?.outcome, repeated?.outcome, changed?.outcome]).toEqual(['created', 'unchanged', 'updated']);
  expect(changed?.feedback).toMatchObject({ helpful: false });
  expect(concurrentVotes.map((vote) => vote?.outcome).sort()).toEqual(['unchanged', 'updated']);
  await assertSavedFeedback(summaryId);
}

async function assertSavedFeedback(summaryId: string): Promise<void> {
  expect(await database!.summaryFeedbackRecord.count({ where: { summaryId, userId } })).toBe(1);
  await assertFeedbackMetrics(summaryId, 1, 1);
}

async function assertFeedbackMetrics(summaryId: string, count: number, positive: number): Promise<void> {
  const metrics = await getSummaryFeedbackMetrics(processId, database!);
  expect(metrics).toEqual([{
    summaryId, version: 1, configurationHash: 'a'.repeat(64), count, positive, rate: count === 0 ? null : positive / count,
  }]);
}

async function reusesSummaryAcrossProviderChange(): Promise<void> {
  await createMovement(1, 'Petição juntada');
  const now = new Date('2026-10-04T12:00:00Z');
  const reservation = await reserve(now);
  await publish(reservation, now);
  if (!reservation.slotId) throw new Error('Expected a reserved generation slot.');
  const reused = await reserveProcessSummaryAttempt({
    processId, rulesVersion, configuration: { provider: 'another-provider', model: 'new-model' },
    configurationHash: 'c'.repeat(64), now: new Date(now.getTime() + 2_000),
    deadlineAt: new Date(now.getTime() + 32_000), retryAt: new Date(now.getTime() + 30_000),
  }, database!);

  expect(reused).toMatchObject({ outcome: 'reused', slotId: reservation.slotId, attemptId: null });
  expect(await database!.summaryAttempt.count({ where: { slotId: reservation.slotId } })).toBe(1);
}

async function rejectsStalePublication(): Promise<void> {
  await createMovement(1, 'Título original');
  const now = new Date('2026-10-04T12:00:00Z');
  const reservation = await reserve(now);
  expect(await markSummaryAttemptDispatched(reservation.attemptId!, now, database!)).toBe(true);
  expect(await markSummaryAttemptDispatched(reservation.attemptId!, now, database!)).toBe(false);
  await database!.movement.updateMany({ where: { processId }, data: { movementContent: 'conteúdo alterado' } });

  const published = await publishProcessAiSummary({
    processId, slotId: reservation.slotId!, attemptId: reservation.attemptId!, rulesVersion,
    paragraphs: ['Sem alteração.'], claims: [], now: new Date(now.getTime() + 1_000),
    deadlineAt: new Date(now.getTime() + 30_000), usage: null, providerRequestId: null,
  }, database!);

  expect(published).toBeNull();
  expect(await database!.processAiSummary.count({ where: { processId } })).toBe(0);
}

async function persistsAttemptsAcrossRestart(): Promise<void> {
  await createMovement(1, 'Petição juntada');
  const now = new Date('2026-10-04T12:00:00Z');
  const firstAttempt = await reserve(now);
  const restartedClient = createDatabaseClient(databaseUrl!);
  try {
    const persistedAttempt = await restartedClient.summaryAttempt.findUnique({ where: { id: firstAttempt.attemptId! } });
    const retry = await reserve(new Date(now.getTime() + 31_000), restartedClient);
    const previous = await restartedClient.summaryAttempt.findUnique({ where: { id: firstAttempt.attemptId! } });
    expect(persistedAttempt?.status).toBe('running');
    expect(previous?.status).toBe('expired');
    expect(retry).toMatchObject({ outcome: 'created', attemptNumber: 2 });
  } finally {
    await restartedClient.$disconnect();
  }
}

async function doesNotReactivateRevertedSource(): Promise<void> {
  await createMovement(1, 'Título original');
  const now = new Date('2026-10-04T12:00:00Z');
  const initial = await reserve(now);
  const firstSummary = await publish(initial, now);
  await database!.movement.updateMany({ where: { processId }, data: { movementTitle: 'Título intermediário' } });
  await observeProcessSummarySource(processId, database!);
  await database!.movement.updateMany({ where: { processId }, data: { movementTitle: 'Título original' } });
  const revertedSource = await observeProcessSummarySource(processId, database!);
  const newRulesSlot = await reserve(new Date(now.getTime() + 2_000), undefined, 'summary-rules-v2');
  const current = await readCurrentProcessAiSummary({ processId, rulesVersion }, database!);

  expect(revertedSource?.sourceRevision).toBe(3);
  expect(firstSummary?.version).toBe(1);
  expect(newRulesSlot).toMatchObject({ outcome: 'created', attemptNumber: 1 });
  expect(newRulesSlot.slotId).not.toBe(initial.slotId);
  expect(current?.summary).toBeNull();
}

async function rollsBackFailedPublication(): Promise<void> {
  await createMovement(1, 'Petição juntada');
  const now = new Date('2026-10-04T12:00:00Z');
  const reservation = await reserve(now);
  const collisionSlot = await reserveProcessSummaryAttempt({
    processId, rulesVersion: 'summary-rules-v2', configuration: { provider: 'fake' },
    configurationHash: 'b'.repeat(64), now, deadlineAt: new Date(now.getTime() + 30_000), retryAt: now,
  }, database!);
  await database!.processAiSummary.create({
    data: {
      id: '22222222-2222-4222-8222-222222222222', processId, version: 2,
      slotId: collisionSlot.slotId!, attemptId: collisionSlot.attemptId!, paragraphs: [], claims: [], generatedAt: now,
    },
  });
  await database!.summarySourceState.update({ where: { processId }, data: { lastSummaryVersion: 1 } });
  const result = publishProcessAiSummary({
    processId, slotId: reservation.slotId!, attemptId: reservation.attemptId!, rulesVersion,
    paragraphs: ['Petição registrada.'], claims: [], now: new Date(now.getTime() + 1_000),
    deadlineAt: new Date(now.getTime() + 30_000), usage: null, providerRequestId: null,
  }, database!);

  await expect(result).rejects.toMatchObject({ code: 'P2002' });
  expect(await database!.summaryAttempt.findUnique({ where: { id: reservation.attemptId! } })).toMatchObject({ status: 'running' });
  expect(await database!.processAiSummary.findMany({ where: { processId }, select: { version: true } })).toEqual([{ version: 2 }]);
}

async function reserve(
  now: Date,
  client: PrismaClient | undefined = database,
  selectedRulesVersion = rulesVersion,
): Promise<SummaryReservation> {
  return reserveProcessSummaryAttempt({
    processId, rulesVersion: selectedRulesVersion, configuration: { provider: 'fake', model: 'test' },
    configurationHash: 'a'.repeat(64), now, deadlineAt: new Date(now.getTime() + 30_000), retryAt: now,
  }, client ?? database!);
}

async function saveFeedback(summaryId: string, helpful: boolean, now: Date): Promise<SaveSummaryFeedbackResult> {
  return saveSummaryFeedback({ processId, summaryId, userId, rulesVersion, helpful, now }, database!);
}

async function recordConcurrentVotes(summaryId: string, now: Date): Promise<SaveSummaryFeedbackResult[]> {
  return Promise.all([
    saveFeedback(summaryId, true, new Date(now.getTime() + 5_000)),
    saveFeedback(summaryId, true, new Date(now.getTime() + 6_000)),
  ]);
}

async function publish(
  reservation: SummaryReservation,
  now: Date,
): Promise<{ id: string; version: number } | null> {
  return publishProcessAiSummary({
    processId, slotId: reservation.slotId!, attemptId: reservation.attemptId!, rulesVersion,
    paragraphs: ['Foi juntada uma petição.'],
    claims: [{ paragraphIndex: 0, sentenceIndex: 0, text: 'Foi juntada uma petição.', sourceRefs: ['m1'] }],
    now: new Date(now.getTime() + 1_000), deadlineAt: new Date(now.getTime() + 30_000), usage: null, providerRequestId: null,
  }, database!);
}

async function createMovement(sourceOrder: number, title: string): Promise<Movement> {
  return database!.movement.create({
    data: { processId, movementDate: new Date('2026-09-01T00:00:00Z'), sourceOrder, movementTitle: title },
  });
}
