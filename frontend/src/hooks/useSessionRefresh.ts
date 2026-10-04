import { useCallback, useEffect, useRef } from 'react';
import { revalidateSession } from '../services/session-runtime';
import type { SessionAction, SessionState } from '../contexts/session-state';

export function useSessionRefresh(
  state: SessionState,
  dispatch: (action: SessionAction) => void,
): () => void {
  const stateRef = useRef(state);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => () => controllerRef.current?.abort(), []);

  return useCallback(() => {
    if (stateRef.current.status === 'logout-pending') return;
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    void revalidateSession(dispatch, controllerRef.current.signal);
  }, [dispatch]);
}
