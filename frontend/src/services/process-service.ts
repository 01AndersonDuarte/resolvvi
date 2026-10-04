import type { MovementPageInput } from '../types/movement-page-input';
import type { MovementPage } from '../types/movement-page';
import type { ProcessDetails } from '../types/process-details';
import type { ProcessSummary } from '../types/process-summary';
import { requestJson } from './http-client';
import { readMovementPage, readProcessDetails } from './process-response';

export async function searchProcess(cnj: string, signal: AbortSignal): Promise<ProcessSummary> {
  return requestJson<ProcessSummary>('/api/processes/search', {
    method: 'POST',
    body: { cnj },
    signal,
  });
}

export async function getProcessById(id: string, signal: AbortSignal): Promise<ProcessDetails> {
  const response = await requestJson<unknown>(`/api/processes/${encodeURIComponent(id)}`, { signal });
  return readProcessDetails(response, id);
}

export async function getProcessMovements(input: MovementPageInput, signal: AbortSignal): Promise<MovementPage> {
  const processId = Number(input.processId);
  const query = new URLSearchParams({ page: String(input.page) });
  const response = await requestJson<unknown>(
    `/api/processes/${encodeURIComponent(input.processId)}/movements?${query.toString()}`,
    { signal },
  );

  return readMovementPage(response, { processId, page: input.page });
}
