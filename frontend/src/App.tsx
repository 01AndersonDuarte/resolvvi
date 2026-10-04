import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AccessPanel, DispatchLayout } from './components/DispatchLayout';
import { FormMessage } from './components/FormMessage';
import { ProtectedBoundary } from './components/ProtectedBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicSessionGate } from './components/PublicSessionGate';
import { useSession } from './hooks/useSession';
import { EmailVerificationView } from './views/EmailVerificationView';
import { LoginView } from './views/LoginView';
import { ResendVerificationView } from './views/ResendVerificationView';
import { SignUpView } from './views/SignUpView';
import { VerificationPendingView } from './views/VerificationPendingView';

export function App({ verificationToken = null }: { verificationToken?: string | null }) {
  return (
    <Routes>
      <Route path="/entrar" element={<PublicPage><LoginView /></PublicPage>} />
      <Route path="/criar-conta" element={<PublicPage><SignUpView /></PublicPage>} />
      <Route path="/confirmacao-pendente" element={<PublicPage><VerificationPendingView /></PublicPage>} />
      <Route path="/confirmar-email" element={<EmailVerificationView token={verificationToken} />} />
      <Route path="/reenviar-confirmacao" element={<PublicPage><ResendVerificationView /></PublicPage>} />
      <Route path="/consulta" element={<ProtectedRoute><VerifiedPage /></ProtectedRoute>} />
      <Route path="*" element={<EntryRedirect />} />
    </Routes>
  );
}

function PublicPage({ children }: { children: ReactNode }) {
  return <PublicSessionGate>{children}</PublicSessionGate>;
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
