import { Navigate, Route, Routes } from 'react-router-dom';
import { AccessPanel, DispatchLayout } from './components/DispatchLayout';
import { FormMessage } from './components/FormMessage';
import { ProtectedBoundary } from './components/ProtectedBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SessionStatus } from './components/SessionStatus';
import type { SessionState } from './contexts/session-state';
import { useSession } from './hooks/useSession';

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<EntryPage />} />
      <Route path="/consulta" element={<ProtectedRoute><VerifiedPage /></ProtectedRoute>} />
      <Route path="*" element={<EntryRedirect />} />
    </Routes>
  );
}

function EntryPage() {
  const { state, refresh, logout } = useSession();
  if (state.status === 'authenticated') return <Navigate to="/consulta" replace />;

  return (
    <DispatchLayout currentStep={1}>
      <AccessPanel title="Entre para continuar" description="Confirme seu acesso antes de consultar um processo." />
      <div className="mx-auto w-full max-w-3xl"><EntryStatus state={state} refresh={refresh} logout={logout} /></div>
      <ProtectedBoundary authenticated={false} />
    </DispatchLayout>
  );
}

function EntryStatus(props: {
  state: SessionState;
  refresh: () => void;
  logout: () => Promise<boolean>;
}) {
  if (props.state.status === 'checking' || props.state.status === 'unavailable') {
    return <SessionStatus status={props.state.status} message={props.state.message} onRetry={props.refresh} />;
  }

  if (props.state.status === 'logout-pending') {
    return <SessionStatus status={props.state.status} message={props.state.message} onRetry={() => void props.logout()} />;
  }

  return <FormMessage message="As opções de acesso estarão disponíveis aqui." tone="info" />;
}

function VerifiedPage() {
  return (
    <DispatchLayout currentStep={2}>
      <AccessPanel title="Acesso confirmado" description="Sua sessão foi validada pelo serviço." />
      <div className="mx-auto w-full max-w-3xl"><FormMessage message="A consulta estará disponível nesta área protegida." tone="success" /></div>
      <ProtectedBoundary authenticated>
        <p className="font-semibold text-ink">Área protegida</p>
      </ProtectedBoundary>
    </DispatchLayout>
  );
}

function EntryRedirect() {
  const { state } = useSession();

  if (state.status === 'authenticated') return <Navigate to="/consulta" replace />;

  return <Navigate to="/entrar" replace />;
}
