import type { SessionResponse } from '../types/api';

export type ActiveSession = SessionResponse & { receivedAt: number };
export type SessionStatus = 'checking' | 'authenticated' | 'anonymous' | 'logout-pending' | 'unavailable';

export type SessionState = {
  status: SessionStatus;
  session: ActiveSession | null;
  generation: number;
  message: string | null;
};

export type SessionAction =
  | { type: 'verified'; session: ActiveSession }
  | { type: 'anonymous'; message?: string }
  | { type: 'unavailable'; message: string }
  | { type: 'logout-pending'; message: string }
  | { type: 'logout-completed' }
  | { type: 'logout-started' }
  | { type: 'checking' };

export const INITIAL_SESSION_STATE: SessionState = {
  status: 'checking',
  session: null,
  generation: 0,
  message: null,
};

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  if (action.type === 'verified') {
    const changedSession = state.session?.sessionId !== action.session.sessionId;

    return {
      status: 'authenticated',
      session: action.session,
      generation: changedSession ? state.generation + 1 : state.generation,
      message: null,
    };
  }

  return reduceAnonymousState(state, action);
}

function reduceAnonymousState(state: SessionState, action: Exclude<SessionAction, { type: 'verified' }>): SessionState {
  if (action.type === 'checking') {
    return { status: 'checking', session: null, generation: state.generation + 1, message: null };
  }

  const message = action.type === 'anonymous'
    ? action.message ?? null
    : action.type === 'unavailable' || action.type === 'logout-pending'
      ? action.message
      : null;
  const status = resolveSessionStatus(action);
  const generation = state.status === 'authenticated' || action.type === 'logout-started' || action.type === 'logout-completed'
    ? state.generation + 1
    : state.generation;

  return { status, session: null, generation, message };
}

function resolveSessionStatus(action: Exclude<SessionAction, { type: 'verified' | 'checking' }>): SessionStatus {
  if (action.type === 'logout-pending' || action.type === 'logout-started') {
    return 'logout-pending';
  }

  if (action.type === 'unavailable') {
    return 'unavailable';
  }

  return 'anonymous';
}
