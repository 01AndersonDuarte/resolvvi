import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDatabaseClient } from '../config/database-client.js';
import { finishSummaryAttempt, markSummaryAttemptDispatched } from '../repositories/summary-attempt-repository.js';
import { publishProcessAiSummary } from '../repositories/process-ai-summary-repository.js';
import type { SummaryEnvironment } from '../types/config.js';
import type { SummaryProvider, SummaryProviderResult } from '../types/summary-provider.js';
import { createProcessAiSummaryService } from './process-ai-summary-service.js';
import { createSummaryGenerationService } from './summary-generation-service.js';
import { createSummaryProviderInput } from './summary-prompt-service.js';
import { validateSummaryOutput } from './summary-validation-service.js';
import {
  connectDatabase, createFixture, database, databaseUrl, disconnectDatabase, processId, userId,
} from '../repositories/process-ai-summary-test-fixture.integration.test.js';

const configuration: SummaryEnvironment = {
  enabled: true, apiKey: 'fake-key', provider: 'openai', model: 'test-model', contextCapacity: 131_072,
};
const completedOutput = {
  language: 'pt-BR' as const,
  paragraphs: [{ sentences: [
    { text: 'O processo recebeu uma petição, que foi juntada aos autos e passou a integrar o histórico processual.', sourceRefs: ['m1'] },
    { text: 'O registro também informa que o documento foi apresentado pela parte autora.', sourceRefs: ['m2'] },
  ] }],
};

function provider(generate: SummaryProvider['generate']): SummaryProvider {
  return {
    configuration: { provider: 'openai', model: 'test-model', configurationHash: 'c'.repeat(64) },
    generate,
  };
}

function createService(
  client: NonNullable<typeof database>,
  aiProvider: SummaryProvider,
): { service: ReturnType<typeof createProcessAiSummaryService>; shutdown: () => Promise<void> } {
  const generation = createSummaryGenerationService({
    provider: aiProvider,
    validateSession: () => Promise.resolve(),
    markDispatched: (attemptId, now) => markSummaryAttemptDispatched(attemptId, now, client),
    validateOutput: validateSummaryOutput,
    publish: async (input) => Boolean(await publishProcessAiSummary(input, client)),
    finish: async (input) => {
      await finishSummaryAttempt({
        attemptId: input.attemptId,
        status: input.failureCode === 'GENERATION_TIMEOUT' ? 'expired' : 'failed',
        failureCode: input.failureCode,
        finishedAt: input.now,
        retryAt: input.retryAt,
      }, client);
    },
    createProviderInput: createSummaryProviderInput,
  });
  return {
    service: createProcessAiSummaryService({ client, configuration, provider: aiProvider, generation }),
    shutdown: () => generation.shutdown(),
  };
}

async function createSourceMovements(): Promise<void> {
  await database!.movement.createMany({ data: [
    { processId, movementDate: new Date('2026-09-01'), movementTitle: 'Petição juntada', movementContent: null, sourceOrder: 0 },
    { processId, movementDate: new Date('2026-09-02'), movementTitle: 'Documento recebido', movementContent: null, sourceOrder: 1 },
  ] });
}

async function waitForAvailable(service: ReturnType<typeof createService>['service']): Promise<void> {
  await vi.waitFor(async () => {
    await expect(service.read({ processId, userId })).resolves.toMatchObject({ status: 'available' });
  }, { timeout: 5_000 });
}

describe('process AI summary application service integration', () => {
  beforeAll(connectDatabase);
  beforeEach(createFixture);
  afterAll(disconnectDatabase);

  it('generates once from the integral source, persists claims, and reuses the available result', generatesAndReusesSummary);
  it('shares one external dispatch across two service and database clients', sharesConcurrentGeneration);
});

async function generatesAndReusesSummary(): Promise<void> {
  await createSourceMovements();
  const generate = vi.fn(() => Promise.resolve({
    output: completedOutput, status: 'completed', refusal: null, model: 'test-model',
    usage: { inputTokens: 500, outputTokens: 40 }, providerRequestId: 'request-123',
  } satisfies SummaryProviderResult));
  const stack = createService(database!, provider(generate));
  try {
    const requested = await stack.service.requestGeneration({ processId, userId, sessionId: 'internal-session' });
    expect(requested.status).toBe('generating');
    await waitForAvailable(stack.service);
    const available = await stack.service.read({ processId, userId });
    const repeatedRequest = await stack.service.requestGeneration({ processId, userId, sessionId: 'internal-session' });
    const summary = await database!.processAiSummary.findFirst({ where: { processId } });
    const slot = await database!.summaryGenerationSlot.findFirst({ where: { processId } });
    const attempt = await database!.summaryAttempt.findFirst({ where: { slotId: slot!.id } });
    expect(generate).toHaveBeenCalledOnce();
    assertSummaryReferences(available);
    expect(repeatedRequest.status).toBe('available');
    expect(summary?.claims).toMatchObject(completedOutput.paragraphs);
    expect(slot?.sourceSnapshot).toMatchObject([{ ref: 'm1' }, { ref: 'm2' }]);
    expect(attempt).toMatchObject({ inputUnits: 500, outputUnits: 40, totalUnits: 540, providerRequestId: 'request-123' });
  } finally {
    await stack.shutdown();
  }
}

function assertSummaryReferences(state: Awaited<ReturnType<ReturnType<typeof createService>['service']['read']>>): void {
  if (!state.summary) throw new Error('Expected an available summary.');
  expect(state.summary.movementCount).toBe(2);
  expect(state.summary.references.map(({ date, title }) => ({ date, title }))).toEqual([
    { date: '01/09/2026', title: 'Petição juntada' },
    { date: '02/09/2026', title: 'Documento recebido' },
  ]);
  expect(state.summary.references.every(({ movementId }) => typeof movementId === 'number')).toBe(true);
}

async function sharesConcurrentGeneration(): Promise<void> {
  await createSourceMovements();
  const secondClient = createDatabaseClient(databaseUrl!);
  let completeProvider: ((result: SummaryProviderResult) => void) | undefined;
  const firstGenerate = vi.fn(() => new Promise<SummaryProviderResult>((resolve) => { completeProvider = resolve; }));
  const secondGenerate = vi.fn(() => Promise.resolve({
    output: completedOutput, status: 'completed', refusal: null, model: 'test-model', usage: null,
  } satisfies SummaryProviderResult));
  const first = createService(database!, provider(firstGenerate));
  const second = createService(secondClient, provider(secondGenerate));
  try {
    const results = await Promise.all([
      first.service.requestGeneration({ processId, userId, sessionId: 'internal-session-1' }),
      second.service.requestGeneration({ processId, userId, sessionId: 'internal-session-2' }),
    ]);
    completeProvider?.({ output: completedOutput, status: 'completed', refusal: null, model: 'test-model', usage: null });
    await waitForAvailable(first.service);

    expect(results.map((result) => result.status)).toEqual(['generating', 'generating']);
    expect(firstGenerate.mock.calls.length + secondGenerate.mock.calls.length).toBe(1);
    expect(await database!.summaryAttempt.count()).toBe(1);
  } finally {
    await Promise.all([first.shutdown(), second.shutdown(), secondClient.$disconnect()]);
  }
}
