import { useEffect } from 'react';
import type { SessionAction, SessionState } from '../contexts/session-state';

const MAX_TIMEOUT_MS = 2_147_483_647;

export function useSessionExpiry(state: SessionState, dispatch: (action: SessionAction) => void): void {
  useEffect(() => {
    if (state.status !== 'authenticated' || state.session === null) return;

    const remainingMs = getRemainingSessionTime(state.session, Date.now());
    if (remainingMs <= 0) {
      dispatch({ type: 'anonymous', message: 'Sua sessão expirou. Entre novamente para continuar.' });
      return;
    }

    const timeout = window.setTimeout(
      () => dispatch({ type: 'anonymous', message: 'Sua sessão expirou. Entre novamente para continuar.' }),
      Math.min(remainingMs, MAX_TIMEOUT_MS),
    );

    return () => window.clearTimeout(timeout);
  }, [dispatch, state]);
}

export function getRemainingSessionTime(
  session: { expiresAt: string; serverTime: string; receivedAt: number },
  now: number,
): number {
  const serverDuration = Date.parse(session.expiresAt) - Date.parse(session.serverTime);
  const elapsedSinceResponse = now - session.receivedAt;

  if (!Number.isFinite(serverDuration) || !Number.isFinite(elapsedSinceResponse)) return 0;

  return Math.max(0, serverDuration - elapsedSinceResponse);
}
