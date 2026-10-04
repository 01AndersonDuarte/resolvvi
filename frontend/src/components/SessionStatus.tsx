import { FormMessage } from './FormMessage';
import { PrimaryButton } from './PrimaryButton';

type SessionStatusProps = {
  status: 'checking' | 'logout-pending' | 'unavailable';
  message: string | null;
  onRetry: () => void;
};

const STATUS_COPY = {
  checking: 'Aguarde enquanto verificamos sua sessão.',
  'logout-pending': 'Não foi possível concluir a saída. Tente novamente.',
  unavailable: 'Não foi possível verificar seu acesso. Tente novamente.',
};

export function SessionStatus({ status, message, onRetry }: SessionStatusProps) {
  const isPendingLogout = status === 'logout-pending';

  return (
    <div className="grid gap-5" aria-busy={status === 'checking'}>
      <FormMessage message={message ?? STATUS_COPY[status]} tone={status === 'unavailable' ? 'error' : 'info'} />
      {status === 'checking' ? <p role="status" className="text-sm text-muted-ink">Verificando acesso…</p> : null}
      {status !== 'checking' ? <PrimaryButton onClick={onRetry}>{isPendingLogout ? 'Concluir saída' : 'Tentar novamente'}</PrimaryButton> : null}
    </div>
  );
}
