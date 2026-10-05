import { useCallback } from 'react';
import { ApiRequestError } from '../services/http-client';
import { requestProcessAiSummary } from '../services/process-ai-summary-service';
import type { SummaryRequestRuntime, SummaryReadState, SummaryStateActions, SummaryStateUpdater, SummaryViewState } from './summary-view-state';

export function useSummaryGeneration(input: {
  processId: number;
  view: SummaryViewState;
  requests: SummaryRequestRuntime;
  readState: SummaryReadState;
  setView: SummaryStateUpdater;
  invalidate: () => void;
} & Pick<SummaryStateActions, 'applyState'>): () => Promise<void> {
  const { processId, view, requests, readState, setView, invalidate, applyState } = input;
  return useCallback(async (): Promise<void> => {
    if (!view.data || view.data.action === 'none' || view.generating) return;
    const request = requests.startRequest();
    const requestIdentity = requests.identity.current;
    setView((current) => ({ ...current, generating: true, error: null }));
    try {
      const result = await requestProcessAiSummary(processId, request.controller.signal);
      if (requestIdentity === requests.identity.current) applyState(result);
    } catch (error: unknown) {
      await reconcileGenerationError({ error, invalidate, readState, requestIdentity, requests, setView });
    } finally {
      requests.finishRequest(request);
    }
  }, [applyState, invalidate, processId, readState, requests, setView, view.data, view.generating]);
}

async function reconcileGenerationError(input: {
  error: unknown;
  invalidate: () => void;
  readState: SummaryReadState;
  requestIdentity: number;
  requests: SummaryRequestRuntime;
  setView: SummaryStateUpdater;
}): Promise<void> {
  if (input.requestIdentity !== input.requests.identity.current) return;
  if (input.error instanceof ApiRequestError && input.error.apiError.code === 'SESSION_INVALID') {
    input.invalidate();
    return;
  }
  const reconciled = await input.readState();
  if (reconciled === null && input.requestIdentity === input.requests.identity.current) {
    input.setView((current) => ({ ...current, generating: false, error: 'Não foi possível confirmar o resultado da solicitação.' }));
  }
}
