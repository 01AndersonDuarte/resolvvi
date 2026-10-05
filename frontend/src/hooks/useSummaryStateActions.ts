import { useCallback } from 'react';
import { ApiRequestError } from '../services/http-client';
import type { AiSummaryState } from '../types/ai-summary-state';
import type { SummaryFeedback } from '../types/summary-feedback';
import type { SummaryStateUpdater } from './summary-view-state';

export function useSummaryStateActions(
  setView: SummaryStateUpdater,
  invalidate: () => void,
  deadlineRef: { current: number | null },
) {
  const applyState = useCallback((data: AiSummaryState): void => {
    deadlineRef.current = getAttemptDeadline(data);
    setView((current) => ({ ...current, data, loading: false, generating: data.status === 'generating', error: null }));
  }, [deadlineRef, setView]);
  const handleFailure = useCallback((error: unknown): void => {
    if (error instanceof ApiRequestError && error.apiError.code === 'SESSION_INVALID') invalidate();
    setView((current) => ({ ...current, loading: false, generating: false, error: 'Não foi possível carregar o resumo agora.' }));
  }, [invalidate, setView]);
  const updateSummary = useCallback((summaryId: string, feedback: SummaryFeedback): void => {
    setView((current) => current.data?.summary?.id !== summaryId ? current : {
      ...current,
      data: { ...current.data, summary: { ...current.data.summary, myFeedback: feedback } },
    });
  }, [setView]);

  return { applyState, handleFailure, updateSummary };
}

function getAttemptDeadline(data: AiSummaryState): number | null {
  if (data.status !== 'generating' || data.attempt === null) return null;
  return Date.now() + Math.max(0, Date.parse(data.attempt.deadlineAt) - Date.parse(data.serverTime));
}
