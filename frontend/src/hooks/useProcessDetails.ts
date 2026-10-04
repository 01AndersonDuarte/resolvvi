import { useEffect } from 'react';
import { getProcessDetailsError } from '../services/process-feedback';
import { getProcessById } from '../services/process-service';
import type { ProcessDetails } from '../types/process-details';
import { useSession } from './useSession';
import { useRequest, type RequestState } from './useRequest';

export function useProcessDetails(id: string | undefined) {
  const { state: session, invalidate } = useSession();
  const request = useRequest(getProcessById, { generation: session.generation, invalidateSession: invalidate });
  const { cancel, run } = request;

  useEffect(() => {
    if (id !== undefined && session.status === 'authenticated') void run(id);
    return cancel;
  }, [cancel, id, run, session.status]);

  return {
    state: request.state,
    errorMessage: getDetailsMessage(request.state),
    retry: () => id === undefined ? Promise.resolve({ status: 'stale' } as const) : run(id),
  };
}

function getDetailsMessage(state: RequestState<ProcessDetails>): string | null {
  if (state.status !== 'error') return null;
  return getProcessDetailsError(state.failure);
}
