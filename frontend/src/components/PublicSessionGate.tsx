import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { AccessPanel, DispatchLayout } from './DispatchLayout';
import { SessionStatus } from './SessionStatus';

type PublicSessionGateProps = { children: ReactNode };

export function PublicSessionGate({ children }: PublicSessionGateProps) {
  const { state, refresh, logout } = useSession();
  if (state.status === 'authenticated') return <Navigate to="/consulta" replace />;
  if (state.status === 'anonymous') return children;

  const retry = state.status === 'logout-pending' ? () => void logout() : refresh;
  return <GateStatus status={state.status} message={state.message} onRetry={retry} />;
}

function GateStatus(props: {
  status: 'checking' | 'logout-pending' | 'unavailable';
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <DispatchLayout currentStep={1}>
      <AccessPanel title="Verificando seu acesso" description="Aguarde a validação antes de continuar.">
        <SessionStatus status={props.status} message={props.message} onRetry={props.onRetry} />
      </AccessPanel>
    </DispatchLayout>
  );
}
