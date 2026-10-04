import { useEffect } from 'react';
import { restoreSession } from '../services/session-runtime';
import type { SessionAction } from '../contexts/session-state';

export function useSessionBootstrap(dispatch: (action: SessionAction) => void): void {
  useEffect(() => {
    const controller = new AbortController();
    void restoreSession(dispatch, controller.signal);

    return () => controller.abort();
  }, [dispatch]);
}
