import { useCallback, useState } from 'react';
import { ApiRequestError } from '../services/http-client';
import { saveProcessAiSummaryFeedback } from '../services/process-ai-summary-service';
import type { SummaryFeedback } from '../types/summary-feedback';
import { useSession } from './useSession';

type SummaryFeedbackInput = {
  processId: number;
  summaryId: string;
  onSaved: (feedback: SummaryFeedback, outcome: string) => void;
  onReconcile: () => Promise<unknown>;
};

export function useSummaryFeedback(input: SummaryFeedbackInput) {
  const { invalidate } = useSession();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const vote = useCallback(async (helpful: boolean): Promise<void> => {
    if (pending) return;
    setPending(true);
    setError(null);
    const controller = new AbortController();
    try {
      const result = await saveProcessAiSummaryFeedback(input.processId, input.summaryId, helpful, controller.signal);
      input.onSaved(result.feedback, result.outcome);
      setMessage(result.outcome === 'updated' ? 'Avaliação atualizada.' : 'Avaliação registrada.');
    } catch (caught: unknown) {
      await handleFeedbackFailure(caught, { invalidate, onReconcile: input.onReconcile, setError });
    } finally {
      setPending(false);
    }
  }, [input, invalidate, pending]);

  return { pending, message, error, vote };
}

async function handleFeedbackFailure(
  caught: unknown,
  dependencies: { invalidate: () => void; onReconcile: () => Promise<unknown>; setError: (message: string) => void },
): Promise<void> {
  if (caught instanceof ApiRequestError && caught.apiError.code === 'SESSION_INVALID') {
    dependencies.invalidate();
    return;
  }
  await dependencies.onReconcile();
  dependencies.setError(caught instanceof ApiRequestError && caught.status === 409
    ? 'Este resumo mudou. A avaliação foi atualizada; confira a versão exibida.'
    : 'Não foi possível confirmar a avaliação. O estado salvo foi consultado; confira sua seleção.');
}
