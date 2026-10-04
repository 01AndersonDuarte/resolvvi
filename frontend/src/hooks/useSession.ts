import { useContext } from 'react';
import { AuthContext } from '../contexts/auth-context';

export function useSession() {
  const session = useContext(AuthContext);

  if (session === null) {
    throw new Error('useSession precisa estar dentro de AuthProvider.');
  }

  return session;
}
