import { requestJson } from './http-client';
import { readAiSummaryState } from './process-ai-summary-response';
import { readSummaryFeedbackResult, type SummaryFeedbackResult } from './process-ai-summary-feedback';
import type { AiSummaryState } from '../types/ai-summary-state';

export async function getProcessAiSummary(
  processId: number,
  signal: AbortSignal,
  attemptId?: string,
): Promise<AiSummaryState> {
  const query = new URLSearchParams({ track: 'true' });
  if (attemptId !== undefined) query.set('attemptId', attemptId);
  const value = await requestJson<unknown>(`${summaryPath(processId)}?${query.toString()}`, { signal });
  return readAiSummaryState(value, processId);
}

export async function requestProcessAiSummary(processId: number, signal: AbortSignal): Promise<AiSummaryState> {
  const value = await requestJson<unknown>(`${summaryPath(processId)}/generations`, { method: 'POST', body: {}, signal });
  return readAiSummaryState(value, processId);
}

export async function saveProcessAiSummaryFeedback(
  processId: number,
  summaryId: string,
  helpful: boolean,
  signal: AbortSignal,
): Promise<SummaryFeedbackResult> {
  const value = await requestJson<unknown>(`${summaryPath(processId)}/${encodeURIComponent(summaryId)}/feedback`, {
    method: 'POST', body: { helpful }, signal,
  });
  return readSummaryFeedbackResult(value);
}

function summaryPath(processId: number): string {
  return `/api/processes/${encodeURIComponent(String(processId))}/ai-summary`;
}
