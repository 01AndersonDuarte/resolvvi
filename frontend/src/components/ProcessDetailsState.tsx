import { FormMessage } from './FormMessage';
import type { RequestState } from '../hooks/useRequest';
import type { ProcessDetails } from '../types/process-details';

type ProcessDetailsStateProps = {
  state: RequestState<ProcessDetails>;
  errorMessage: string | null;
  onRetry: () => void;
  invalidAddress: boolean;
};

export function ProcessDetailsState({ state, errorMessage, onRetry, invalidAddress }: ProcessDetailsStateProps) {
  if (invalidAddress) return <ErrorState message="O endereço do processo é inválido. Confira o endereço e tente novamente." />;
  if (state.status === 'pending' || state.status === 'idle') return <LoadingState />;
  if (state.status === 'error') {
    const canRetry = state.failure?.error.code !== 'PROCESS_NOT_FOUND' && state.failure?.error.code !== 'INVALID_INPUT';
    return <ErrorState message={errorMessage ?? 'Não foi possível carregar os dados do processo. Tente novamente.'} onRetry={canRetry ? onRetry : undefined} />;
  }
  return null;
}

function LoadingState() {
  return <div role="status" aria-live="polite" aria-busy="true" className="grid min-h-40 place-items-center rounded-2xl border border-line bg-protected p-6 text-muted-ink">Carregando dados do processo</div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <section className="mx-auto grid w-full max-w-4xl gap-6 rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-8">
    <FormMessage message={message} tone="info" />
    {onRetry ? <button type="button" onClick={onRetry} className="min-h-12 justify-self-start rounded-lg bg-route px-5 py-3 text-center font-semibold text-white hover:bg-route-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-route/30">Tentar novamente</button> : null}
  </section>;
}
