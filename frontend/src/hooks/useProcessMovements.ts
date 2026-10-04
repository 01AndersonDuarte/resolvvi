import { useCallback, useEffect, useRef, useState } from 'react';
import { getProcessMovementsError } from '../services/process-feedback';
import { getProcessMovements } from '../services/process-service';
import type { MovementPage } from '../types/movement-page';
import type { MovementPageInput } from '../types/movement-page-input';
import { useSession } from './useSession';
import { useRequest } from './useRequest';

type ConfirmedPage = { processId: string; generation: number; data: MovementPage };
type ProcessMissingHandler = () => void;

export function useProcessMovements(processId: string, onProcessMissing?: ProcessMissingHandler) {
  const { state: session, invalidate } = useSession();
  const request = useRequest<MovementPageInput, MovementPage>(getProcessMovements, {
    generation: session.generation,
    invalidateSession: invalidate,
  });
  const [confirmed, setConfirmed] = useState<ConfirmedPage | null>(null);
  const requestedPageRef = useRef(1);
  const { cancel, run } = request;

  const handleResult = useCallback((result: Awaited<ReturnType<typeof run>>) => {
    if (result.status === 'success' && result.data.processId === Number(processId)) {
      setConfirmed({ processId, generation: session.generation, data: result.data });
    }
    if (result.status === 'error' && result.failure?.error.code === 'PROCESS_NOT_FOUND') {
      onProcessMissing?.();
    }
    return result;
  }, [onProcessMissing, processId, session.generation]);

  const loadPage = useCallback(async (page: number) => {
    requestedPageRef.current = page;
    const result = await run({ processId, page });
    return handleResult(result);
  }, [handleResult, processId, run]);

  useEffect(() => {
    if (session.status === 'authenticated') {
      requestedPageRef.current = 1;
      void run({ processId, page: 1 }).then(handleResult);
    }
    return cancel;
  }, [cancel, handleResult, processId, run, session.status]);

  const page = confirmed?.processId === processId && confirmed.generation === session.generation
    ? confirmed.data
    : null;
  const processMissing = request.state.status === 'error' &&
    request.state.failure?.error.code === 'PROCESS_NOT_FOUND';

  return {
    page,
    pending: request.state.status === 'pending',
    errorMessage: request.state.status === 'error'
      ? getProcessMovementsError(request.state.failure, request.state.error)
      : null,
    processMissing,
    loadPage,
    retry: () => loadPage(requestedPageRef.current),
  };
}
