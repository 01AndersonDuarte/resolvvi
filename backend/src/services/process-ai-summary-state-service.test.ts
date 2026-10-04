import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { PreparedSummarySource } from '../types/process-ai-summary.js';
import {
  findLatestProcessAiSummary, findLatestProcessSummaryAttempt, findProcessSummaryAttempt, readCurrentProcessAiSummary,
} from '../repositories/process-ai-summary-repository.js';
import { expireOverdueSummaryAttempt } from '../repositories/summary-attempt-repository.js';
import { serializeProcessAiSummary } from './summary-serialization-service.js';
import type { ProcessAiSummaryServiceDependencies } from './process-ai-summary-service.js';
import { loadProcessAiSummaryState } from './process-ai-summary-state-service.js';

vi.mock('../repositories/process-ai-summary-repository.js', () => ({
  findLatestProcessAiSummary: vi.fn(), findLatestProcessSummaryAttempt: vi.fn(),
  findProcessSummaryAttempt: vi.fn(), readCurrentProcessAiSummary: vi.fn(),
}));
vi.mock('../repositories/summary-attempt-repository.js', () => ({ expireOverdueSummaryAttempt: vi.fn() }));
vi.mock('./summary-serialization-service.js', () => ({ serializeProcessAiSummary: vi.fn() }));

const now = new Date('2026-10-04T12:00:00Z');
const source: PreparedSummarySource = {
  processId: 42, movements: [], sourceHash: 'a'.repeat(64), eligibility: 'eligible', hasLimitedInformation: false,
};

function dependencies(contextCapacity = 131_072): ProcessAiSummaryServiceDependencies {
  return {
    client: {} as PrismaClient,
    configuration: { enabled: false, apiKey: null, provider: 'openai', model: 'model', contextCapacity },
    provider: null, generation: { acquire: () => null, start: () => false, shutdown: () => Promise.resolve() }, now: () => now,
  };
}

function current(
  eligibility: PreparedSummarySource['eligibility'] = 'eligible',
  summary: unknown = null,
): { source: PreparedSummarySource; sourceRevision: number; lastSummaryVersion: number; summary: unknown } {
  return { source: { ...source, eligibility }, sourceRevision: 1, lastSummaryVersion: 0, summary };
}

function attempt(
  status: string,
  deadlineAt = new Date(now.getTime() + 10_000),
  failureCode: string | null = null,
): { id: string; status: string; startedAt: Date; deadlineAt: Date; failureCode: string | null; slot: { retryAt: null; rulesVersion: string } } {
  return {
    id: 'attempt-id', status, startedAt: now, deadlineAt, failureCode,
    slot: { retryAt: null, rulesVersion: 'summary-rules-v1' },
  };
}

beforeEach(() => vi.clearAllMocks());

describe('loadProcessAiSummaryState', () => {
  it('reports source ineligibility and context capacity without provider availability', reportsEligibility);
  it('reports initial, running, and expired attempts', reportsAttemptStates);
  it('reports failures and stale summaries with the correct retry reason', reportsFailureAndStale);
  it('serializes the current summary and maps read failures safely', serializesOrHidesReadFailure);
  it('validates attempt ownership before reading the process', validatesAttemptOwnership);
});

async function reportsEligibility(): Promise<void> {
  vi.mocked(readCurrentProcessAiSummary).mockResolvedValueOnce(current('no_movements') as never);
  await expect(loadProcessAiSummaryState({ processId: 42, userId: 'u' }, dependencies())).resolves.toMatchObject({ status: 'no_movements' });
  vi.mocked(readCurrentProcessAiSummary).mockResolvedValueOnce(current('no_usable_text') as never);
  await expect(loadProcessAiSummaryState({ processId: 42, userId: 'u' }, dependencies())).resolves.toMatchObject({ status: 'insufficient_data' });
  vi.mocked(readCurrentProcessAiSummary).mockResolvedValueOnce(current() as never);
  await expect(loadProcessAiSummaryState({ processId: 42, userId: 'u' }, dependencies(1))).resolves.toMatchObject({ status: 'context_exceeded' });
}

async function reportsAttemptStates(): Promise<void> {
  vi.mocked(readCurrentProcessAiSummary).mockResolvedValue(current() as never);
  vi.mocked(findLatestProcessSummaryAttempt).mockResolvedValueOnce(null);
  await expect(loadProcessAiSummaryState({ processId: 42, userId: 'u' }, dependencies())).resolves.toMatchObject({ status: 'not_generated' });
  vi.mocked(findLatestProcessSummaryAttempt).mockResolvedValueOnce(attempt('running') as never);
  await expect(loadProcessAiSummaryState({ processId: 42, userId: 'u' }, dependencies())).resolves.toMatchObject({ status: 'generating' });
  vi.mocked(findLatestProcessSummaryAttempt).mockResolvedValueOnce(attempt('running', new Date(now.getTime() - 1)) as never);
  await expect(loadProcessAiSummaryState({ processId: 42, userId: 'u' }, dependencies())).resolves.toMatchObject({ status: 'failed', failureCode: 'GENERATION_TIMEOUT' });
  expect(expireOverdueSummaryAttempt).toHaveBeenCalledOnce();
}

async function reportsFailureAndStale(): Promise<void> {
  vi.mocked(readCurrentProcessAiSummary).mockResolvedValue(current() as never);
  vi.mocked(findLatestProcessSummaryAttempt).mockResolvedValueOnce(attempt('failed', now, 'PROVIDER_RATE_LIMIT') as never);
  await expect(loadProcessAiSummaryState({ processId: 42, userId: 'u' }, dependencies())).resolves.toMatchObject({ failureCode: 'PROVIDER_RATE_LIMIT', action: 'retry' });
  vi.mocked(findLatestProcessSummaryAttempt).mockResolvedValueOnce(attempt('succeeded') as never);
  vi.mocked(findLatestProcessAiSummary).mockResolvedValueOnce({ slot: { rulesVersion: 'old-rules' } } as never);
  await expect(loadProcessAiSummaryState({ processId: 42, userId: 'u' }, dependencies())).resolves.toMatchObject({ status: 'stale', failureCode: 'RULES_CHANGED' });
}

async function serializesOrHidesReadFailure(): Promise<void> {
  vi.mocked(readCurrentProcessAiSummary).mockResolvedValue({ ...current(), summary: { id: 's' } } as never);
  vi.mocked(serializeProcessAiSummary).mockReturnValue({ id: 's' } as never);
  await expect(loadProcessAiSummaryState({ processId: 42, userId: 'u' }, dependencies())).resolves.toMatchObject({ status: 'available', summary: { id: 's' } });
  vi.mocked(readCurrentProcessAiSummary).mockRejectedValueOnce(new Error('private details'));
  await expect(loadProcessAiSummaryState({ processId: 42, userId: 'u' }, dependencies())).rejects.toMatchObject({ code: 'SUMMARY_READ_FAILED' });
}

async function validatesAttemptOwnership(): Promise<void> {
  vi.mocked(findProcessSummaryAttempt).mockResolvedValueOnce(null);
  await expect(loadProcessAiSummaryState({ processId: 42, userId: 'u', attemptId: 'attempt-id' }, dependencies())).rejects.toMatchObject({ status: 404 });
}
