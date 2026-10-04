import { useReducer } from 'react';
import { useSessionBootstrap } from './useSessionBootstrap';
import { useSessionEvents } from './useSessionEvents';
import { useSessionExpiry } from './useSessionExpiry';
import { useSessionActions } from './useSessionActions';
import { useSessionRefresh } from './useSessionRefresh';
import { INITIAL_SESSION_STATE, sessionReducer } from '../contexts/session-state';

export function useSessionController() {
  const [state, dispatch] = useReducer(sessionReducer, INITIAL_SESSION_STATE);
  const refresh = useSessionRefresh(state, dispatch);

  useSessionBootstrap(dispatch);
  useSessionExpiry(state, dispatch);
  useSessionEvents(state.status, dispatch, refresh);

  return { state, refresh, ...useSessionActions(dispatch) };
}
