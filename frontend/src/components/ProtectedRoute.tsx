import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { SessionStatus } from './SessionStatus';

type ProtectedRouteProps = { children: ReactNode };

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { state, refresh, logout } = useSession();
  const location = useLocation();

  if (state.status === 'authenticated') return children;
  if (state.status === 'anonymous') return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  if (state.status === 'logout-pending') return <SessionStatus status={state.status} message={state.message} onRetry={() => void logout()} />;

  return <SessionStatus status={state.status} message={state.message} onRetry={refresh} />;
}
