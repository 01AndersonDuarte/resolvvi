import type { ProcessDetails } from '../types/process-details';

type ProcessDetailsContentProps = { process: ProcessDetails };

export function ProcessDetailsContent({ process }: ProcessDetailsContentProps) {
  return <section aria-labelledby="process-found-title" className="grid w-full min-w-0 gap-6 rounded-2xl border border-line bg-white p-5 text-left shadow-panel sm:p-8">
    <div className="grid gap-3">
      <h1 id="process-found-title" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Processo</h1>
      <dl className="grid min-w-0 gap-2 rounded-xl border border-line bg-protected p-4 sm:p-5">
        <dt className="text-sm font-semibold text-muted-ink">Número do processo (CNJ)</dt>
        <dd className="break-all text-lg font-semibold tracking-wide text-ink">{process.cnj}</dd>
      </dl>
    </div>
    <ProcessGeneralFields process={process} />
    <p className="text-sm leading-6 text-muted-ink">Informações da base importada, sem atualização automática junto ao tribunal</p>
  </section>;
}

function ProcessGeneralFields({ process }: ProcessDetailsContentProps) {
  return <dl className="grid min-w-0 gap-4 rounded-xl border border-line p-4 sm:grid-cols-2 sm:p-5">
    <DetailField label="Foro" value={process.forum} />
    <DetailField label="Vara" value={process.court} />
    <DetailField label="Valor da ação" value={process.lawsuitValue} />
    <DetailField label="Quantidade de autores" value={getAuthorCount(process.numberOfAuthors)} />
  </dl>;
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return <div className="grid min-w-0 gap-1">
    <dt className="text-sm font-semibold text-muted-ink">{label}</dt>
    <dd className="break-words whitespace-pre-wrap text-base text-ink">{value ?? 'Não informado'}</dd>
  </div>;
}

function getAuthorCount(count: number | null): string | null {
  return count === null ? null : String(count);
}
