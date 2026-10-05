import { useEffect, useState } from 'react';
import type { AiSummaryState } from '../types/ai-summary-state';

type SummaryStateProps = {
  data: AiSummaryState | null;
  loading: boolean;
  generating: boolean;
  error: string | null;
  onGenerate: () => void;
  onRefresh: () => void;
};

export function SummaryState({ data, loading, generating, error, onGenerate, onRefresh }: SummaryStateProps) {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setSecondsElapsed((elapsed) => elapsed + 1), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  if (loading && data === null) return <p role="status" aria-live="polite" aria-busy="true" className="text-sm text-muted-ink">Carregando resumo processual…</p>;
  if (error) return <div role="alert" className="grid justify-items-start gap-3 text-sm text-danger-ink"><p>{error}</p><button type="button" onClick={onRefresh} className="min-h-11 rounded-lg border border-line px-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-route/30">Consultar novamente</button></div>;
  if (!data) return <p role="status" className="text-sm text-muted-ink">O resumo ainda não está disponível.</p>;
  return <SummaryStatus data={data} secondsElapsed={secondsElapsed} generating={generating} onGenerate={onGenerate} />;
}

function SummaryStatus({ data, secondsElapsed, generating, onGenerate }: {
  data: AiSummaryState; secondsElapsed: number; generating: boolean; onGenerate: () => void;
}) {
  if (data.status === 'generating') return <p role="status" aria-live="polite" aria-busy="true" className="text-sm text-muted-ink">Gerando resumo… Esta página acompanhará a tentativa por até 30 segundos.</p>;
  if (data.status === 'available') return null;
  const retryAt = data.attempt?.retryAt ? Date.parse(data.attempt.retryAt) : 0;
  const remaining = Math.max(0, Math.ceil((retryAt - Date.parse(data.serverTime) - (secondsElapsed * 1_000)) / 1_000));
  const action = getActionLabel(data.action);
  return <div className="grid justify-items-start gap-3">
    <p role="status" aria-live="polite" className="text-sm leading-6 text-muted-ink">{data.message ?? getStatusMessage(data.status)}</p>
    {data.action !== 'none' ? <button type="button" onClick={onGenerate} disabled={generating || remaining > 0}
      className="min-h-12 rounded-lg bg-route px-5 font-semibold text-white hover:bg-route-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-route/30 disabled:cursor-wait disabled:bg-muted-ink">
      {generating ? 'Solicitando…' : remaining > 0 ? `${action} em ${remaining}s` : action}
    </button> : null}
  </div>;
}

function getActionLabel(action: AiSummaryState['action']): string {
  if (action === 'update') return 'Atualizar resumo';
  if (action === 'retry') return 'Tentar novamente';
  return 'Gerar resumo';
}

function getStatusMessage(status: AiSummaryState['status']): string {
  const messages: Record<AiSummaryState['status'], string> = {
    available: 'Resumo disponível.', not_generated: 'Ainda não há um resumo para este processo.',
    generating: 'Gerando resumo…', stale: 'As movimentações mudaram. Gere um resumo atualizado.',
    no_movements: 'Não há movimentações disponíveis para gerar um resumo.',
    insufficient_data: 'As informações disponíveis são insuficientes para gerar um resumo.',
    context_exceeded: 'Este histórico excede o limite disponível para gerar um resumo completo. Consulte as movimentações.',
    failed: 'Não foi possível gerar o resumo agora.',
  };
  return messages[status];
}
