import { ApiRequestError } from './http-client';
import { fetchSession, revokeSession } from './session-service';
import type { SessionAction } from '../contexts/session-state';

const PENDING_LOGOUT_KEY = 'auth.pendingLogout';
const INVALIDATION_KEY = 'auth.sessionInvalidated';
const CHANNEL_NAME = 'auth-session-events';
const LOGOUT_EVENT = { type: 'logout' };
const INVALIDATION_EVENT = { type: 'invalidate' };

type Dispatch = (action: SessionAction) => void;
type SessionOperations = {
  fetchSession: (signal: AbortSignal) => Promise<{ sessionId: string; expiresAt: string; serverTime: string }>;
  revokeSession: (signal: AbortSignal) => Promise<void>;
};

const sessionOperations: SessionOperations = { fetchSession, revokeSession };

export async function restoreSession(
  dispatch: Dispatch,
  signal: AbortSignal,
  operations: SessionOperations = sessionOperations,
): Promise<void> {
  if (hasPendingLogout()) {
    dispatch({ type: 'logout-pending', message: 'Não foi possível concluir a saída. Tente novamente.' });
    if (!await tryRevoke(signal, operations)) return;
  }

  await checkRemoteSession(dispatch, signal, operations);
}

export async function revalidateSession(
  dispatch: Dispatch,
  signal: AbortSignal,
  operations: SessionOperations = sessionOperations,
): Promise<void> {
  if (hasPendingLogout()) {
    dispatch({ type: 'logout-pending', message: 'Não foi possível concluir a saída. Tente novamente.' });
    return;
  }

  dispatch({ type: 'checking' });
  await checkRemoteSession(dispatch, signal, operations);
}

export async function signOut(
  dispatch: Dispatch,
  signal: AbortSignal,
  operations: SessionOperations = sessionOperations,
): Promise<boolean> {
  dispatch({ type: 'logout-started' });
  savePendingLogout();
  announceEvent(LOGOUT_EVENT);

  try {
    await operations.revokeSession(signal);
    clearPendingLogout();
    dispatch({ type: 'logout-completed' });
    return true;
  } catch {
    dispatch({ type: 'logout-pending', message: 'Não foi possível concluir a saída. Tente novamente.' });
    return false;
  }
}

export function invalidateSession(dispatch: Dispatch): void {
  dispatch({ type: 'anonymous', message: 'Sua sessão foi encerrada. Entre novamente para continuar.' });
  announceEvent(INVALIDATION_EVENT);
}

export function announceLogout(): void {
  announceEvent(LOGOUT_EVENT);
}

export function announceInvalidation(): void {
  announceEvent(INVALIDATION_EVENT);
}

function announceEvent(event: typeof LOGOUT_EVENT | typeof INVALIDATION_EVENT): void {
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(event);
    channel.close();
    return;
  }

  if (event.type === 'logout') return;

  try {
    window.localStorage.setItem(INVALIDATION_KEY, String(Date.now()));
  } catch {
    return;
  }
}

export function isInvalidationEvent(value: unknown): boolean {
  return isRecord(value) && value.type === 'invalidate';
}

export function isLogoutEvent(value: unknown): boolean {
  return isRecord(value) && value.type === 'logout';
}

export function clearPendingLogoutMarker(): void {
  clearPendingLogout();
}

export function isSessionInvalid(error: unknown): boolean {
  return error instanceof ApiRequestError && error.apiError.code === 'SESSION_INVALID';
}

function hasPendingLogout(): boolean {
  try {
    return window.localStorage.getItem(PENDING_LOGOUT_KEY) === 'true';
  } catch {
    return false;
  }
}

function savePendingLogout(): void {
  try {
    window.localStorage.setItem(PENDING_LOGOUT_KEY, 'true');
  } catch {
    return;
  }
}

function clearPendingLogout(): void {
  try {
    window.localStorage.removeItem(PENDING_LOGOUT_KEY);
  } catch {
    return;
  }
}

async function tryRevoke(signal: AbortSignal, operations: SessionOperations): Promise<boolean> {
  try {
    await operations.revokeSession(signal);
    clearPendingLogout();
    return true;
  } catch {
    return false;
  }
}

export async function receiveLogout(dispatch: Dispatch, signal: AbortSignal): Promise<void> {
  dispatch({ type: 'logout-started' });
  savePendingLogout();

  if (await tryRevoke(signal, sessionOperations)) {
    dispatch({ type: 'logout-completed' });
    return;
  }

  dispatch({ type: 'logout-pending', message: 'Não foi possível concluir a saída. Tente novamente.' });
}

async function checkRemoteSession(
  dispatch: Dispatch,
  signal: AbortSignal,
  operations: SessionOperations,
): Promise<void> {
  try {
    const session = await operations.fetchSession(signal);
    if (!signal.aborted) dispatch({ type: 'verified', session: { ...session, receivedAt: Date.now() } });
  } catch (error: unknown) {
    if (signal.aborted) return;
    dispatchSessionFailure(dispatch, error);
  }
}

function dispatchSessionFailure(dispatch: Dispatch, error: unknown): void {
  if (isSessionInvalid(error)) {
    dispatch({ type: 'anonymous' });
    return;
  }

  dispatch({ type: 'unavailable', message: 'Não foi possível verificar seu acesso. Tente novamente.' });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
