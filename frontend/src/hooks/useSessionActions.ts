import { useCallback } from 'react';
import { clearPendingLogoutMarker, invalidateSession, signOut } from '../services/session-runtime';
import type { SessionAction } from '../contexts/session-state';
import type { SessionResponse } from '../types/api';

export function useSessionActions(dispatch: (action: SessionAction) => void): {
  completeLogin: (session: SessionResponse) => void;
  logout: () => Promise<boolean>;
  invalidate: () => void;
} {
  const completeLogin = useCallback((session: SessionResponse) => {
    clearPendingLogoutMarker();
    dispatch({ type: 'verified', session: { ...session, receivedAt: Date.now() } });
  }, [dispatch]);
  const logout = useCallback(() => signOut(dispatch, new AbortController().signal), [dispatch]);
  const invalidate = useCallback(() => invalidateSession(dispatch), [dispatch]);

  return { completeLogin, logout, invalidate };
}
