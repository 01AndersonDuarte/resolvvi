import { useEffect } from 'react';
import { getProcessDetailsError } from '../services/process-feedback';
import { getProcessById } from '../services/process-service';
import type { ProcessSummary } from '../types/process-summary';
import { useSession } from './useSession';
import { useRequest, type RequestState } from './useRequest';

export function useProcessDetails(id: string | undefined) {
  const { state: session, invalidate } = useSession();
  const request = useRequest(getProcessById, { generation: session.generation, invalidateSession: invalidate });
  const { cancel, run } = request;

  useEffect(() => {
    if (id !== undefined) void run(id);
    return cancel;
  }, [cancel, id, run]);

  return { state: request.state, errorMessage: getDetailsMessage(request.state) };
}

function getDetailsMessage(state: RequestState<ProcessSummary>): string | null {
  if (state.status !== 'error') return null;
  return getProcessDetailsError(state.failure);
}
