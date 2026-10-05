import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProcessAiSummary, requestProcessAiSummary, saveProcessAiSummaryFeedback } from './process-ai-summary-service';

afterEach(() => vi.unstubAllGlobals());

describe('process AI summary HTTP service', () => {
  it('reads the current state with tracking excluded from usage denominators', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(makeState('not_generated')));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getProcessAiSummary(17, new AbortController().signal);

    expect(result.status).toBe('not_generated');
    expect(fetchMock).toHaveBeenCalledWith('/api/processes/17/ai-summary?track=true', expect.objectContaining({ credentials: 'include' }));
  });

  it('requests generation through an explicit POST with an empty body', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(makeState('generating')));
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestProcessAiSummary(17, new AbortController().signal);

    expect(result.status).toBe('generating');
    expect(fetchMock).toHaveBeenCalledWith('/api/processes/17/ai-summary/generations', expect.objectContaining({
      method: 'POST', body: '{}', credentials: 'include',
    }));
  });

  it('parses the persisted feedback result without exposing other voters', async () => {
    const response = { outcome: 'created', feedback: { helpful: true, createdAt: '2026-10-04T13:00:00.000Z', updatedAt: '2026-10-04T13:00:00.000Z' } };
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(response)));

    await expect(saveProcessAiSummaryFeedback(17, summaryId, true, new AbortController().signal)).resolves.toEqual(response);
  });
});

function makeState(status: 'not_generated' | 'generating') {
  return {
    processId: 17, status, summary: null,
    attempt: status === 'generating' ? {
      id: 'f1792cfe-b7a3-4358-b7ab-22365389bda0', startedAt: '2026-10-04T13:00:00.000Z',
      deadlineAt: '2026-10-04T13:00:30.000Z', retryAt: '2026-10-04T13:00:30.000Z',
    } : null,
    message: null, failureCode: null, action: status === 'not_generated' ? 'generate' : 'none',
    serverTime: '2026-10-04T13:00:00.000Z',
  };
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

const summaryId = '752a061e-31b0-44c4-bf41-c83e72670ea1';
