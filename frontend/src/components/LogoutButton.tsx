import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearProcessInput } from '../services/process-input';
import { useSession } from '../hooks/useSession';

export function LogoutButton() {
  const { logout } = useSession();
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async (): Promise<void> => {
    setPending(true);
    const completed = await logout();
    clearProcessInput();
    if (completed) navigate('/entrar', { replace: true });
    setPending(false);
  };

  return <button type="button" onClick={() => void handleLogout()} disabled={pending} className="min-h-11 rounded-lg border border-white/35 px-4 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 disabled:cursor-wait disabled:opacity-60">{pending ? 'Saindo…' : 'Sair'}</button>;
}
