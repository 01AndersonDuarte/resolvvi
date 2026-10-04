import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { SummaryEnvironment } from '../types/config.js';
import type { SummaryProvider } from '../types/summary-provider.js';
import { loadProcessAiSummaryState } from './process-ai-summary-state-service.js';
import { createProcessAiSummaryService } from './process-ai-summary-service.js';

vi.mock('./process-ai-summary-state-service.js', () => ({ loadProcessAiSummaryState: vi.fn() }));

const configuration: SummaryEnvironment = {
  enabled: false, apiKey: null, provider: 'openai', model: 'model', contextCapacity: 131_072,
};
const generation = { acquire: () => null, start: () => false, shutdown: () => Promise.resolve() };

function createService(enabled: boolean): ReturnType<typeof createProcessAiSummaryService> {
  return createProcessAiSummaryService({
    client: {} as PrismaClient,
    configuration: { ...configuration, enabled },
    provider: null as SummaryProvider | null,
    generation,
    now: () => new Date('2026-10-04T12:00:00Z'),
    monotonicNow: () => 0,
  });
}

describe('createProcessAiSummaryService generation eligibility', () => {
  it('does not schedule generation when the provider is disabled', rejectsDisabledProvider);
  it('rejects generation for an ineligible source before checking provider availability', rejectsIneligibleSource);
});

async function rejectsDisabledProvider(): Promise<void> {
  vi.mocked(loadProcessAiSummaryState).mockResolvedValueOnce({
    processId: 42, status: 'not_generated', summary: null, attempt: null, message: null,
    failureCode: null, action: 'generate', serverTime: '2026-10-04T12:00:00.000Z',
  });

  await expect(createService(false).requestGeneration({ processId: 42, userId: 'user', sessionId: 'session' }))
    .rejects.toMatchObject({ status: 503, code: 'SERVICE_UNAVAILABLE' });
}

async function rejectsIneligibleSource(): Promise<void> {
  vi.mocked(loadProcessAiSummaryState).mockResolvedValueOnce({
    processId: 42, status: 'insufficient_data', summary: null, attempt: null, message: 'insufficient',
    failureCode: null, action: 'none', serverTime: '2026-10-04T12:00:00.000Z',
  });

  await expect(createService(true).requestGeneration({ processId: 42, userId: 'user', sessionId: 'session' }))
    .rejects.toMatchObject({ status: 422, code: 'SUMMARY_NOT_ELIGIBLE' });
}
