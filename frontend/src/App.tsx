import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicSessionGate } from './components/PublicSessionGate';
import { useSession } from './hooks/useSession';
import { LoginView } from './views/LoginView';
import { SignUpView } from './views/SignUpView';
import { ProcessFoundView } from './views/ProcessFoundView';
import { ProcessSearchView } from './views/ProcessSearchView';

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<PublicPage><LoginView /></PublicPage>} />
      <Route path="/criar-conta" element={<PublicPage><SignUpView /></PublicPage>} />
      <Route path="/consulta" element={<ProtectedRoute><ProcessSearchView /></ProtectedRoute>} />
      <Route path="/processos/:id" element={<ProtectedRoute><ProcessFoundView /></ProtectedRoute>} />
      <Route path="*" element={<EntryRedirect />} />
    </Routes>
  );
}

function PublicPage({ children }: { children: ReactNode }) {
  return <PublicSessionGate>{children}</PublicSessionGate>;
}

function EntryRedirect() {
  const { state } = useSession();

  if (state.status === 'authenticated') return <Navigate to="/consulta" replace />;

  return <Navigate to="/entrar" replace />;
}
