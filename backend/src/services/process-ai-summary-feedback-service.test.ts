import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient, SummaryFeedbackRecord } from '../generated/prisma/client.js';
import { saveSummaryFeedback } from '../repositories/summary-feedback-repository.js';
import type { ProcessAiSummaryServiceDependencies } from './process-ai-summary-service.js';
import { saveProcessAiSummaryFeedback } from './process-ai-summary-feedback-service.js';

vi.mock('../repositories/summary-feedback-repository.js', () => ({ saveSummaryFeedback: vi.fn() }));

const now = new Date('2026-10-04T12:00:00Z');
const record = {
  helpful: true, createdAt: now, updatedAt: now,
} as SummaryFeedbackRecord;
const findSummary = vi.fn();

function dependencies(): ProcessAiSummaryServiceDependencies {
  return {
    client: { processAiSummary: { findUnique: findSummary } } as unknown as PrismaClient,
    configuration: { enabled: true, apiKey: 'unused', provider: 'openai', model: 'model', contextCapacity: 1000 },
    provider: null,
    generation: { acquire: () => null, start: () => false, shutdown: () => Promise.resolve() },
    now: () => now,
  };
}

describe('saveProcessAiSummaryFeedback', () => {
  it('returns persisted feedback and maps the outcome', savesFeedback);
  it('returns not found for a summary from another process', rejectsWrongProcess);
  it('returns conflict for an obsolete summary on the same process', rejectsObsoleteSummary);
  it('maps unexpected persistence errors to a safe service error', hidesPersistenceFailure);
});

async function savesFeedback(): Promise<void> {
  vi.mocked(saveSummaryFeedback).mockResolvedValueOnce({ outcome: 'updated', feedback: record });

  await expect(saveProcessAiSummaryFeedback({
    processId: 42, summaryId: 'summary-id', userId: 'user-id', helpful: true, requestId: 'request-id',
  }, dependencies())).resolves.toEqual({
    outcome: 'updated', feedback: { helpful: true, createdAt: now.toISOString(), updatedAt: now.toISOString() },
  });
  expect(saveSummaryFeedback).toHaveBeenCalledWith({
    processId: 42, summaryId: 'summary-id', userId: 'user-id', helpful: true,
    rulesVersion: 'summary-rules-v14', now,
  }, expect.anything());
}

async function rejectsWrongProcess(): Promise<void> {
  vi.mocked(saveSummaryFeedback).mockResolvedValueOnce(null);
  const deps = dependencies();
  findSummary.mockResolvedValueOnce({ processId: 99 });

  await expect(saveProcessAiSummaryFeedback({
    processId: 42, summaryId: 'summary-id', userId: 'user-id', helpful: false,
  }, deps)).rejects.toMatchObject({ status: 404, code: 'SUMMARY_NOT_FOUND' });
}

async function rejectsObsoleteSummary(): Promise<void> {
  vi.mocked(saveSummaryFeedback).mockResolvedValueOnce(null);
  const deps = dependencies();
  findSummary.mockResolvedValueOnce({ processId: 42 });

  await expect(saveProcessAiSummaryFeedback({
    processId: 42, summaryId: 'summary-id', userId: 'user-id', helpful: false,
  }, deps)).rejects.toMatchObject({ status: 409, code: 'SUMMARY_NOT_CURRENT' });
}

async function hidesPersistenceFailure(): Promise<void> {
  vi.mocked(saveSummaryFeedback).mockRejectedValueOnce(new Error('sensitive database detail'));

  await expect(saveProcessAiSummaryFeedback({
    processId: 42, summaryId: 'summary-id', userId: 'user-id', helpful: false,
  }, dependencies())).rejects.toMatchObject({ status: 503, code: 'SUMMARY_FEEDBACK_FAILED' });
}
