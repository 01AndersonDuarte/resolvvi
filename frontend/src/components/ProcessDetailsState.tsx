import { Link } from 'react-router-dom';
import { FormMessage } from './FormMessage';
import type { RequestState } from '../hooks/useRequest';
import type { ProcessSummary } from '../types/process-summary';

type ProcessDetailsStateProps = {
  state: RequestState<ProcessSummary>;
  errorMessage: string | null;
};

export function ProcessDetailsState({ state, errorMessage }: ProcessDetailsStateProps) {
  if (state.status === 'pending' || state.status === 'idle') return <LoadingState />;
  if (state.status === 'error') return <UnavailableState message={errorMessage ?? 'Não encontramos esse processo na base disponível.'} />;
  return null;
}

function LoadingState() {
  return <div role="status" aria-live="polite" aria-busy="true" className="grid min-h-40 place-items-center rounded-2xl border border-line bg-protected p-6 text-muted-ink">Carregando processo…</div>;
}

function UnavailableState({ message }: { message: string }) {
  return <section className="mx-auto grid w-full max-w-4xl gap-6 rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-8">
    <FormMessage message={message} tone="info" />
    <Link to="/consulta" className="min-h-12 justify-self-start rounded-lg bg-route px-5 py-3 text-center font-semibold text-white hover:bg-route-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-route/30">Voltar à consulta</Link>
  </section>;
}
