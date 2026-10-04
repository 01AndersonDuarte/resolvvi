import { useEffect, useRef } from 'react';
import type { ProcessSummary } from '../types/process-summary';

type ProcessDetailsContentProps = { process: ProcessSummary };

export function ProcessDetailsContent({ process }: ProcessDetailsContentProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return <section aria-labelledby="process-found-title" className="grid w-full gap-6 rounded-2xl border border-line bg-white p-5 text-left shadow-panel sm:p-8">
    <div className="grid gap-3">
      <h1 id="process-found-title" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Processo encontrado</h1>
      <p className="text-sm leading-6 text-muted-ink">Correspondência exata na base disponível.</p>
    </div>
    <dl className="grid gap-2 rounded-xl border border-line bg-protected p-4 sm:p-5">
      <dt className="text-sm font-semibold text-muted-ink">Número do processo (CNJ)</dt>
      <dd className="break-all text-lg font-semibold tracking-wide text-ink">{process.cnj}</dd>
    </dl>
  </section>;
}
