import type { SummaryFeedback } from '../types/summary-feedback';
import { useSummaryFeedback } from '../hooks/useSummaryFeedback';

type SummaryFeedbackProps = {
  processId: number;
  summaryId: string;
  feedback: SummaryFeedback | null;
  onSaved: (feedback: SummaryFeedback, outcome: string) => void;
  onReconcile: () => Promise<unknown>;
};

export function SummaryFeedback({ processId, summaryId, feedback, onSaved, onReconcile }: SummaryFeedbackProps) {
  const { pending, message, error, vote } = useSummaryFeedback({ processId, summaryId, onSaved, onReconcile });

  return <section aria-labelledby="summary-feedback-title" className="grid gap-3 border-t border-line pt-4">
    <h3 id="summary-feedback-title" className="font-semibold text-ink">Este resumo foi útil?</h3>
    <div className="flex flex-wrap gap-3">
      <FeedbackButton value={true} selected={feedback?.helpful === true} pending={pending} onVote={vote}>Sim</FeedbackButton>
      <FeedbackButton value={false} selected={feedback?.helpful === false} pending={pending} onVote={vote}>Não</FeedbackButton>
    </div>
    {message ? <p role="status" aria-live="polite" className="text-sm text-success-ink">{message}</p> : null}
    {error ? <p role="alert" className="text-sm text-danger-ink">{error}</p> : null}
  </section>;
}

function FeedbackButton({ value, selected, pending, onVote, children }: {
  value: boolean; selected: boolean; pending: boolean; onVote: (value: boolean) => void; children: string;
}) {
  return <button type="button" aria-pressed={selected} disabled={pending} onClick={() => onVote(value)}
    className="min-h-11 rounded-lg border border-line px-5 font-semibold text-ink hover:bg-protected focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-route/30 disabled:cursor-wait disabled:opacity-60">
    {children}
  </button>;
}
