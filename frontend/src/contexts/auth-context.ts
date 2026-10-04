import { createContext } from 'react';
import type { SessionResponse } from '../types/api';
import type { SessionState } from './session-state';

export type AuthContextValue = {
  state: SessionState;
  refresh: () => void;
  completeLogin: (session: SessionResponse) => void;
  logout: () => Promise<boolean>;
  invalidate: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
