import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '../services/http-client';
import { getProcessAiSummary, requestProcessAiSummary } from '../services/process-ai-summary-service';
import { useSession } from './useSession';
import type { AiSummaryState } from '../types/ai-summary-state';
import type { SummaryFeedback } from '../types/summary-feedback';

const POLL_INTERVAL_MS = 1_000;
const REQUEST_TIMEOUT_MS = 12_000;

type SummaryViewState = {
  data: AiSummaryState | null;
  loading: boolean;
  generating: boolean;
  error: string | null;
};

const INITIAL_STATE: SummaryViewState = { data: null, loading: true, generating: false, error: null };

export function useProcessAiSummary(processId: number) {
  const { invalidate } = useSession();
  const [view, setView] = useState<SummaryViewState>(INITIAL_STATE);
  const identity = useRef(0);
  const controllers = useRef(new Set<AbortController>());
  const deadline = useRef<number | null>(null);

  const applyState = useCallback((data: AiSummaryState): void => {
    deadline.current = data.status === 'generating' && data.attempt !== null
      ? Date.now() + Math.max(0, Date.parse(data.attempt.deadlineAt) - Date.parse(data.serverTime))
      : null;
    setView((current) => ({ ...current, data, loading: false, generating: data.status === 'generating', error: null }));
  }, []);

  const handleFailure = useCallback((error: unknown): void => {
    if (error instanceof ApiRequestError && error.apiError.code === 'SESSION_INVALID') invalidate();
    setView((current) => ({ ...current, loading: false, generating: false, error: 'Não foi possível carregar o resumo agora.' }));
  }, [invalidate]);

  const startRequest = useCallback(() => {
    const controller = new AbortController();
    controllers.current.add(controller);
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    return { controller, timeout, hasTimedOut: () => timedOut };
  }, []);

  const finishRequest = useCallback((request: { controller: AbortController; timeout: number }) => {
    window.clearTimeout(request.timeout);
    controllers.current.delete(request.controller);
  }, []);

  const readState = useCallback(async (attemptId?: string): Promise<AiSummaryState | null> => {
    const request = startRequest();
    const requestIdentity = identity.current;
    try {
      const result = await getProcessAiSummary(processId, request.controller.signal, attemptId);
      if (requestIdentity !== identity.current || result.processId !== processId) return null;
      applyState(result);
      return result;
    } catch (error: unknown) {
      if (requestIdentity !== identity.current) return null;
      if (request.hasTimedOut()) {
        setView((current) => ({ ...current, loading: false, generating: false, error: 'A consulta do resumo excedeu o tempo limite.' }));
        return null;
      }
      if (request.controller.signal.aborted) return null;
      handleFailure(error);
      return null;
    } finally {
      finishRequest(request);
    }
  }, [applyState, finishRequest, handleFailure, processId, startRequest]);

  useEffect(() => {
    identity.current += 1;
    const currentIdentity = identity.current;
    const activeControllers = controllers.current;
    deadline.current = null;
    const initialRead = window.setTimeout(() => void readState(), 0);
    return () => {
      window.clearTimeout(initialRead);
      if (identity.current === currentIdentity) identity.current += 1;
      activeControllers.forEach((controller) => controller.abort());
      activeControllers.clear();
    };
  }, [readState]);

  useEffect(() => {
    if (view.data?.status !== 'generating' || view.data.attempt === null) return undefined;
    const attemptId = view.data.attempt.id;
    const remaining = Math.max(0, (deadline.current ?? Date.now()) - Date.now());
    if (remaining === 0) {
      setView((current) => ({ ...current, generating: false, error: 'A geração demorou mais que o esperado. Atualize o estado antes de tentar novamente.' }));
      return undefined;
    }
    const timer = window.setTimeout(() => void readState(attemptId), Math.min(POLL_INTERVAL_MS, remaining));
    return () => window.clearTimeout(timer);
  }, [readState, view.data]);

  const generate = useCallback(async () => {
    if (!view.data || view.data.action === 'none' || view.generating) return;
    const request = startRequest();
    const requestIdentity = identity.current;
    setView((current) => ({ ...current, generating: true, error: null }));
    try {
      const result = await requestProcessAiSummary(processId, request.controller.signal);
      if (requestIdentity === identity.current) applyState(result);
    } catch (error: unknown) {
      if (requestIdentity === identity.current) {
        if (error instanceof ApiRequestError && error.apiError.code === 'SESSION_INVALID') {
          invalidate();
          return;
        }
        const reconciled = await readState();
        if (reconciled === null && requestIdentity === identity.current) {
          setView((current) => ({ ...current, generating: false, error: 'Não foi possível confirmar o resultado da solicitação.' }));
        }
      }
    } finally {
      finishRequest(request);
    }
  }, [applyState, finishRequest, invalidate, processId, readState, startRequest, view.data, view.generating]);

  const refresh = useCallback(() => readState(), [readState]);
  const updateSummary = useCallback((summaryId: string, feedback: SummaryFeedback) => {
    setView((current) => current.data?.summary?.id !== summaryId ? current : {
      ...current,
      data: { ...current.data, summary: { ...current.data.summary, myFeedback: feedback } },
    });
  }, []);

  return { ...view, generate, refresh, updateSummary };
}
