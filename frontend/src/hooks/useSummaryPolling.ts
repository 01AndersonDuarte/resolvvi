import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { AiSummaryState } from '../types/ai-summary-state';
import type { SummaryReadState, SummaryStateUpdater } from './summary-view-state';

const POLL_INTERVAL_MS = 1_000;

export function useSummaryPolling(
  data: AiSummaryState | null,
  deadline: MutableRefObject<number | null>,
  readState: SummaryReadState,
  setView: SummaryStateUpdater,
): void {
  useEffect(() => {
    if (data?.status !== 'generating' || data.attempt === null) return undefined;
    const attemptId = data.attempt.id;
    const remaining = Math.max(0, (deadline.current ?? Date.now()) - Date.now());
    if (remaining === 0) return reportExpiredGeneration(setView);
    const timer = window.setTimeout(() => void readState(attemptId), Math.min(POLL_INTERVAL_MS, remaining));
    return () => window.clearTimeout(timer);
  }, [data, deadline, readState, setView]);
}

function reportExpiredGeneration(setView: SummaryStateUpdater): undefined {
  setView((current) => ({ ...current, generating: false, error: 'A geração demorou mais que o esperado. Atualize o estado antes de tentar novamente.' }));
  return undefined;
}
