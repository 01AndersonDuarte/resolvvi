import { useEffect, useRef } from 'react';
import {
  isInvalidationEvent,
  isLogoutEvent,
  receiveLogout,
} from '../services/session-runtime';
import type { SessionAction } from '../contexts/session-state';

const CHANNEL_NAME = 'auth-session-events';
const INVALIDATION_KEY = 'auth.sessionInvalidated';
const PENDING_LOGOUT_KEY = 'auth.pendingLogout';

export function useSessionEvents(
  status: string,
  dispatch: (action: SessionAction) => void,
  refresh: () => void,
): void {
  const statusRef = useRef(status);
  const hasBeenHidden = useRef(false);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const controller = new AbortController();
    const channel = createSessionChannel();
    const handleMessage = (event: MessageEvent<unknown>) => handleSessionEvent(
      event.data, statusRef.current, dispatch, controller.signal,
    );
    const handleStorage = (event: StorageEvent) => handleStorageEvent(
      event, statusRef.current, dispatch, controller.signal,
    );
    const handlePageHide = () => dispatch({ type: 'checking' });
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    const handleVisibility = () => handleVisibilityChange(hasBeenHidden, refresh);

    channel?.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => cleanUpSessionEvents({
      channel, controller, handleMessage, handleStorage, handlePageHide, handlePageShow, handleVisibility,
    });
  }, [dispatch, refresh]);
}

function handleVisibilityChange(hasBeenHidden: { current: boolean }, refresh: () => void): void {
  if (document.visibilityState === 'hidden') hasBeenHidden.current = true;
  if (document.visibilityState !== 'visible' || !hasBeenHidden.current) return;
  hasBeenHidden.current = false;
  refresh();
}

function handleSessionEvent(
  value: unknown,
  currentStatus: string,
  dispatch: (action: SessionAction) => void,
  signal: AbortSignal,
): void {
  if (isLogoutEvent(value)) {
    void receiveLogout(dispatch, signal);
    return;
  }

  if (isInvalidationEvent(value) && currentStatus !== 'logout-pending') {
    dispatch({ type: 'anonymous', message: 'Sua sessão foi encerrada. Entre novamente para continuar.' });
  }
}

function handleStorageEvent(
  event: StorageEvent,
  currentStatus: string,
  dispatch: (action: SessionAction) => void,
  signal: AbortSignal,
): void {
  if (event.key === PENDING_LOGOUT_KEY && currentStatus !== 'logout-pending') {
    void receiveLogout(dispatch, signal);
  }

  if (event.key === INVALIDATION_KEY && currentStatus !== 'logout-pending') {
    dispatch({ type: 'anonymous', message: 'Sua sessão foi encerrada. Entre novamente para continuar.' });
  }
}

function createSessionChannel(): BroadcastChannel | null {
  return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
}

function cleanUpSessionEvents(input: {
  channel: BroadcastChannel | null;
  controller: AbortController;
  handleMessage: (event: MessageEvent<unknown>) => void;
  handleStorage: (event: StorageEvent) => void;
  handlePageHide: () => void;
  handlePageShow: (event: PageTransitionEvent) => void;
  handleVisibility: () => void;
}): void {
  input.controller.abort();
  input.channel?.removeEventListener('message', input.handleMessage);
  input.channel?.close();
  window.removeEventListener('storage', input.handleStorage);
  window.removeEventListener('pagehide', input.handlePageHide);
  window.removeEventListener('pageshow', input.handlePageShow);
  document.removeEventListener('visibilitychange', input.handleVisibility);
}
