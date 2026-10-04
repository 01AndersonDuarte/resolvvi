import type { ProcessSummary } from '../types/process-summary';
import { requestJson } from './http-client';

export async function searchProcess(cnj: string, signal: AbortSignal): Promise<ProcessSummary> {
  return requestJson<ProcessSummary>('/api/processes/search', {
    method: 'POST',
    body: { cnj },
    signal,
  });
}

export async function getProcessById(id: string, signal: AbortSignal): Promise<ProcessSummary> {
  return requestJson<ProcessSummary>(`/api/processes/${encodeURIComponent(id)}`, { signal });
}
