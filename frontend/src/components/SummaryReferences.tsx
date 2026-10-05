import type { SummaryReference } from '../types/summary-reference';

type SummaryReferencesProps = { references: SummaryReference[] };

export function SummaryReferences({ references }: SummaryReferencesProps) {
  if (references.length === 0) return null;
  return <section aria-labelledby="summary-references-title" className="grid gap-3 border-t border-line pt-4">
    <h3 id="summary-references-title" className="font-semibold text-ink">Referências para conferência</h3>
    <p className="text-sm leading-6 text-muted-ink">Confira manualmente cada evento na lista de movimentações abaixo, usando a data e o título. A paginação do histórico permanece independente.</p>
    <ol className="grid gap-3">
      {groupReferences(references).map((reference, index) => <li key={`${reference.paragraphIndex}:${reference.sentenceIndex}:${index}`} className="rounded-lg border border-line bg-protected p-3">
        <p className="text-sm leading-6 text-ink">“{reference.sentenceText}”</p>
        <ul className="mt-2 grid gap-1 text-sm text-muted-ink">{reference.items.map((item) => <li key={`${item.movementId}:${item.date}:${item.title}`}>{item.date} · {item.title || 'Sem título'}</li>)}</ul>
      </li>)}
    </ol>
  </section>;
}

function groupReferences(references: SummaryReference[]): Array<SummaryReference & { items: SummaryReference[] }> {
  const groups = new Map<string, SummaryReference[]>();
  references.forEach((reference) => {
    const key = `${reference.paragraphIndex}:${reference.sentenceIndex}`;
    groups.set(key, [...(groups.get(key) ?? []), reference]);
  });
  return [...groups.values()].map((items) => ({ ...items[0]!, items }));
}
