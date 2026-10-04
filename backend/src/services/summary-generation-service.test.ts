import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PreparedSummarySource } from '../types/process-ai-summary.js';
import type { SummaryProvider, SummaryProviderResult, ValidatedSummary } from '../types/summary-provider.js';
import { createSummaryGenerationService, type SummaryGenerationDependencies, type SummaryGenerationJob } from './summary-generation-service.js';

const source: PreparedSummarySource = {
  processId: 42,
  movements: [],
  sourceHash: 'a'.repeat(64),
  eligibility: 'eligible',
  hasLimitedInformation: false,
};
const output: SummaryProviderResult = {
  output: {}, status: 'completed', refusal: null, model: 'model', usage: null,
};
const validated: ValidatedSummary = {
  output: { language: 'pt-BR', paragraphs: [{ sentences: [{ text: 'Resumo em português.', sourceRefs: ['m1'] }] }] },
  body: 'Resumo em português.', references: [],
};

function createJob(requestedAt = 0): SummaryGenerationJob {
  return {
    processId: 42, slotId: 'slot-1', attemptId: 'attempt-1', sessionId: 'session-1',
    rulesVersion: 'summary-rules-v1', source, requestedAt, startedAt: new Date('2026-10-04T12:00:00Z'),
  };
}

function createDependencies(provider: SummaryProvider): SummaryGenerationDependencies {
  return {
    provider,
    validateSession: vi.fn(() => Promise.resolve()),
    markDispatched: vi.fn(() => Promise.resolve(true)),
    validateOutput: () => validated,
    publish: vi.fn(() => Promise.resolve(true)),
    finish: vi.fn(() => Promise.resolve()),
    createProviderInput: (_source, signal) => ({ instructions: 'prompt', source: '{}', schema: {}, maxOutputTokens: 4096, signal }),
    now: () => new Date('2026-10-04T12:00:01Z'),
    monotonicNow: () => 0,
  };
}

function successfulProvider(): SummaryProvider {
  return {
    configuration: { provider: 'openai', model: 'model', configurationHash: 'b'.repeat(64) },
    generate: () => Promise.resolve(output),
  };
}

async function flushGeneration(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function assertDispatchSucceeded(
  dependencies: SummaryGenerationDependencies,
  generate: ReturnType<typeof vi.spyOn>,
): Promise<void> {
  await vi.waitFor(() => expect(dependencies.publish).toHaveBeenCalledWith(expect.objectContaining({
    processId: 42,
    paragraphs: ['Resumo em português.'],
    rulesVersion: 'summary-rules-v1',
  })));
  expect(dependencies.validateSession).toHaveBeenCalledWith('session-1');
  expect(dependencies.markDispatched).toHaveBeenCalledTimes(1);
  expect(generate).toHaveBeenCalledTimes(1);
}

afterEach(() => vi.useRealTimers());

describe('createSummaryGenerationService capacity', () => {
  it('limita a quatro execuções locais e libera capacidade ao terminar', async () => {
    const dependencies = createDependencies(successfulProvider());
    const service = createSummaryGenerationService(dependencies);

    expect([0, 1, 2, 3].map((index) => service.start(createJob(index)))).toEqual([true, true, true, true]);
    expect(service.start(createJob(4))).toBe(false);
    await vi.waitFor(() => expect(dependencies.publish).toHaveBeenCalledTimes(4));
    await vi.waitFor(() => expect(service.start(createJob(5))).toBe(true));
    await service.shutdown();
  });
});

describe('createSummaryGenerationService dispatch', () => {
  it('revalida sessão e marca despacho antes de chamar o provedor uma única vez', async () => {
    const provider = successfulProvider();
    const dependencies = createDependencies(provider);
    const generate = vi.spyOn(provider, 'generate');
    const service = createSummaryGenerationService(dependencies);

    expect(service.start(createJob())).toBe(true);
    await assertDispatchSucceeded(dependencies, generate);
    await service.shutdown();
  });
});

describe('createSummaryGenerationService dispatch failure', () => {
  it('não despacha se a tentativa já tiver sido marcada', async () => {
    const provider = successfulProvider();
    const dependencies = createDependencies(provider);
    const generate = vi.spyOn(provider, 'generate');
    dependencies.markDispatched = vi.fn(() => Promise.resolve(false));
    const service = createSummaryGenerationService(dependencies);

    service.start(createJob());
    await flushGeneration();

    expect(generate).not.toHaveBeenCalled();
    expect(dependencies.finish).toHaveBeenCalledWith(expect.objectContaining({ failureCode: 'GENERATION_TIMEOUT' }));
    await service.shutdown();
  });
});

describe('createSummaryGenerationService deadline', () => {
  it('aborta no orçamento do provedor e descarta uma resposta tardia', async () => {
    vi.useFakeTimers();
    let resolveProvider: ((result: SummaryProviderResult) => void) | undefined;
    let receivedSignal: AbortSignal | undefined;
    const provider: SummaryProvider = {
      configuration: { provider: 'openai', model: 'model', configurationHash: 'b'.repeat(64) },
      generate: (input) => {
        receivedSignal = input.signal;
        return new Promise((resolve) => { resolveProvider = resolve; });
      },
    };
    const dependencies = createDependencies(provider);
    const publish = vi.spyOn(dependencies, 'publish');
    const service = createSummaryGenerationService(dependencies);
    service.start(createJob());
    await flushGeneration();

    await vi.advanceTimersByTimeAsync(25_000);
    resolveProvider?.(output);
    await flushGeneration();

    expect(receivedSignal?.aborted).toBe(true);
    expect(publish).not.toHaveBeenCalled();
    expect(dependencies.finish).toHaveBeenCalledWith(expect.objectContaining({ failureCode: 'GENERATION_TIMEOUT' }));
    await service.shutdown();
  });

  it('cancels and awaits active work during shutdown', cancelsActiveWorkOnShutdown);
});

async function cancelsActiveWorkOnShutdown(): Promise<void> {
  let receivedSignal: AbortSignal | undefined;
  const provider: SummaryProvider = {
    configuration: { provider: 'openai', model: 'model', configurationHash: 'b'.repeat(64) },
    generate: (input) => {
      receivedSignal = input.signal;
      return new Promise((_resolve, reject) => input.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
    },
  };
  const dependencies = createDependencies(provider);
  const service = createSummaryGenerationService(dependencies);
  expect(service.start(createJob())).toBe(true);
  await vi.waitFor(() => expect(receivedSignal).toBeDefined());

  await service.shutdown();

  expect(receivedSignal?.aborted).toBe(true);
  expect(dependencies.finish).toHaveBeenCalledWith(expect.objectContaining({ failureCode: 'GENERATION_TIMEOUT' }));
  expect(service.start(createJob())).toBe(false);
}
