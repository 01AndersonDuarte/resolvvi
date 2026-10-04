import { useProcessMovements } from '../hooks/useProcessMovements';
import { MovementItem } from './MovementItem';
import { MovementPagination } from './MovementPagination';

type ProcessMovementsProps = { processId: number; onProcessMissing: () => void };

export function ProcessMovements({ processId, onProcessMissing }: ProcessMovementsProps) {
  const movements = useProcessMovements(String(processId), onProcessMissing);
  const page = movements.page;

  return <section aria-labelledby="movements-title" aria-busy={movements.pending} className="grid min-w-0 gap-5 rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-8">
    <header className="grid gap-1">
      <h2 id="movements-title" className="text-xl font-semibold text-ink">Movimentações</h2>
      <p className="text-sm text-muted-ink">{page ? `${page.total} movimentações · Mais recentes primeiro` : 'Mais recentes primeiro'}</p>
    </header>
    <MovementsFeedback pending={movements.pending} hasPage={page !== null} errorMessage={movements.errorMessage} onRetry={() => void movements.retry()} />
    {page?.total === 0 ? <p className="rounded-xl bg-protected p-4 text-sm text-muted-ink">Nenhuma movimentação disponível na base para este processo.</p> : null}
    {page && page.items.length > 0 ? <ol key={`${page.processId}:${page.page}`} className="grid min-w-0 gap-6">
      {page.items.map((movement) => <li key={movement.id}><MovementItem movement={movement} /></li>)}
    </ol> : null}
    {page ? <MovementPagination page={page.page} pageSize={page.pageSize} total={page.total} totalPages={page.totalPages} pending={movements.pending} onPageChange={(destination) => void movements.loadPage(destination)} /> : null}
  </section>;
}

function MovementsFeedback({ pending, hasPage, errorMessage, onRetry }: {
  pending: boolean;
  hasPage: boolean;
  errorMessage: string | null;
  onRetry: () => void;
}) {
  if (pending && !hasPage) return <p role="status" aria-live="polite" aria-busy="true" className="text-sm text-muted-ink">Carregando movimentações</p>;
  if (pending) return <p role="status" aria-live="polite" aria-busy="true" className="text-sm text-muted-ink">Carregando outra página de movimentações</p>;
  if (errorMessage === null) return null;

  return <div role="alert" className="grid justify-items-start gap-3 rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger-ink">
    <p>{errorMessage}</p>
    <button type="button" onClick={onRetry} className="min-h-11 rounded-lg border border-danger/30 px-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-danger/20">Tentar novamente</button>
  </div>;
}
