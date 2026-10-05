import { useCallback } from 'react';
import { getProcessAiSummary } from '../services/process-ai-summary-service';
import type { AiSummaryState } from '../types/ai-summary-state';
import type { SummaryReadState, SummaryRequestRuntime, SummaryStateActions, SummaryStateUpdater } from './summary-view-state';

export function useSummaryStateReader(input: {
  processId: number;
  requests: SummaryRequestRuntime;
  setView: SummaryStateUpdater;
} & Pick<SummaryStateActions, 'applyState' | 'handleFailure'>): SummaryReadState {
  const { processId, requests, setView, applyState, handleFailure } = input;
  return useCallback(async (attemptId?: string): Promise<AiSummaryState | null> => {
    const request = requests.startRequest();
    const requestIdentity = requests.identity.current;
    try {
      const result = await getProcessAiSummary(processId, request.controller.signal, attemptId);
      if (requestIdentity !== requests.identity.current || result.processId !== processId) return null;
      applyState(result);
      return result;
    } catch (error: unknown) {
      if (requestIdentity !== requests.identity.current) return null;
      if (request.hasTimedOut()) {
        setView((current) => ({ ...current, loading: false, generating: false, error: 'A consulta do resumo excedeu o tempo limite.' }));
        return null;
      }
      if (request.controller.signal.aborted) return null;
      handleFailure(error);
      return null;
    } finally {
      requests.finishRequest(request);
    }
  }, [applyState, handleFailure, processId, requests, setView]);
}
