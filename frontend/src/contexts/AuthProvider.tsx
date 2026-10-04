import type { ReactNode } from 'react';
import { AuthContext } from './auth-context';
import { useSessionController } from '../hooks/useSessionController';

type AuthProviderProps = { children: ReactNode };

export function AuthProvider({ children }: AuthProviderProps) {
  const session = useSessionController();

  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}
