type MovementPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pending: boolean;
  onPageChange: (page: number) => void;
};

export function MovementPagination(props: MovementPaginationProps) {
  if (props.totalPages <= 1) return null;
  const firstItem = ((props.page - 1) * props.pageSize) + 1;
  const lastItem = Math.min(props.page * props.pageSize, props.total);

  return <nav aria-label="Paginação das movimentações" className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
    <p className="text-sm text-muted-ink">Movimentações {firstItem}–{lastItem} de {props.total}</p>
    <div className="flex gap-2">
      <button type="button" onClick={() => props.onPageChange(props.page - 1)} disabled={props.pending || props.page <= 1} className="min-h-11 rounded-lg border border-line px-4 font-semibold text-ink hover:bg-protected focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-route/30 disabled:cursor-not-allowed disabled:opacity-50">Anterior</button>
      <button type="button" onClick={() => props.onPageChange(props.page + 1)} disabled={props.pending || props.page >= props.totalPages} className="min-h-11 rounded-lg border border-line px-4 font-semibold text-ink hover:bg-protected focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-route/30 disabled:cursor-not-allowed disabled:opacity-50">Próxima</button>
    </div>
  </nav>;
}
