import { SummaryContent } from './SummaryContent';
import { SummaryFeedback } from './SummaryFeedback';
import { SummaryReferences } from './SummaryReferences';
import { SummaryState } from './SummaryState';
import { useProcessAiSummary } from '../hooks/useProcessAiSummary';
import type { AiSummary } from '../types/ai-summary';
import type { SummaryFeedback as SummaryFeedbackValue } from '../types/summary-feedback';

type ProcessAiSummaryProps = { processId: number };

export function ProcessAiSummary({ processId }: ProcessAiSummaryProps) {
  const summary = useProcessAiSummary(processId);
  const data = summary.data;
  const current = data?.summary ?? null;
  const handleSaved = (feedback: SummaryFeedbackValue) => {
    if (current) summary.updateSummary(current.id, feedback);
  };

  return <section aria-labelledby="ai-summary-title" aria-busy={summary.loading || summary.generating} className="grid min-w-0 gap-5 rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-8">
    <header className="grid gap-2">
      <h2 id="ai-summary-title" className="text-xl font-semibold text-ink">Resumo por inteligência artificial</h2>
      <p className="text-sm leading-6 text-muted-ink">Resumo gerado por inteligência artificial a partir das movimentações disponíveis. Pode conter erros; não é uma decisão oficial nem orientação jurídica</p>
    </header>
    <SummaryState key={data?.serverTime ?? 'initial'} data={data} loading={summary.loading} generating={summary.generating} error={summary.error}
      onGenerate={() => void summary.generate()} onRefresh={() => void summary.refresh()} />
    {current ? <SummaryAvailable processId={processId} summary={current} onSaved={handleSaved} onConflict={summary.refresh} /> : null}
  </section>;
}

function SummaryAvailable({ processId, summary, onSaved, onConflict }: {
  processId: number; summary: AiSummary | null;
  onSaved: (feedback: SummaryFeedbackValue, outcome: string) => void; onConflict: () => Promise<unknown>;
}) {
  if (!summary) return null;
  return <div className="grid min-w-0 gap-5">
    <div className="grid gap-2 text-sm text-muted-ink"><p>Versão {summary.version} · Gerado em {new Date(summary.generatedAt).toLocaleString('pt-BR')} · {summary.movementCount} movimentações consideradas.</p><p>Os dados vêm de uma base importada, sem atualização automática junto ao tribunal.</p></div>
    <SummaryContent paragraphs={summary.paragraphs} />
    <SummaryReferences references={summary.references} />
    <SummaryFeedback processId={processId} summaryId={summary.id} feedback={summary.myFeedback} onSaved={onSaved} onReconcile={onConflict} />
  </div>;
}
