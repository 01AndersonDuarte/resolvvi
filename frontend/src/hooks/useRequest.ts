import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '../services/http-client';

export type RequestState<TData> =
  | { status: 'idle' | 'pending'; data: null; error: null }
  | { status: 'success'; data: TData; error: null }
  | { status: 'error'; data: null; error: string };

type RequestTask<TInput, TOutput> = (input: TInput, signal: AbortSignal) => Promise<TOutput>;
type UseRequestOptions = { generation: number; invalidateSession: () => void; timeoutMs?: number };
type RequestRefs = { id: MutableRefObject<number>; generation: MutableRefObject<number>; controller: MutableRefObject<AbortController | null> };

const DEFAULT_TIMEOUT_MS = 15_000;
const IDLE_STATE: RequestState<never> = { status: 'idle', data: null, error: null };

export function useRequest<TInput, TOutput>(
  request: RequestTask<TInput, TOutput>,
  options: UseRequestOptions,
): { state: RequestState<TOutput>; run: (input: TInput) => Promise<void>; cancel: () => void } {
  const [state, setState] = useState<RequestState<TOutput>>(IDLE_STATE);
  const [stateGeneration, setStateGeneration] = useState(options.generation);
  const idRef = useRef(0);
  const generationRef = useRef(options.generation);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    generationRef.current = options.generation;
    idRef.current += 1;
    abortRequest(controllerRef);
  }, [options.generation]);
  useEffect(() => () => abortRequest(controllerRef), []);

  const cancel = useCallback(() => {
    idRef.current += 1;
    abortRequest(controllerRef);
    setState(IDLE_STATE);
    setStateGeneration(options.generation);
  }, [options.generation]);
  const run = useCallback((input: TInput) => executeRequest({
    input, request, refs: { id: idRef, generation: generationRef, controller: controllerRef },
    generation: options.generation, timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    invalidateSession: options.invalidateSession,
    setState: (nextState) => {
      setState(nextState);
      setStateGeneration(options.generation);
    },
  }), [options.generation, options.invalidateSession, options.timeoutMs, request]);

  return { state: stateGeneration === options.generation ? state : IDLE_STATE, run, cancel };
}

type ExecuteRequestInput<TInput, TOutput> = {
  input: TInput;
  request: RequestTask<TInput, TOutput>;
  refs: RequestRefs;
  generation: number;
  timeoutMs: number;
  invalidateSession: () => void;
  setState: (state: RequestState<TOutput>) => void;
};

async function executeRequest<TInput, TOutput>(input: ExecuteRequestInput<TInput, TOutput>): Promise<void> {
  const attempt = startRequest(input);
  input.setState({ status: 'pending', data: null, error: null });

  try {
    const data = await input.request(input.input, attempt.controller.signal);
    if (isCurrentRequest(input, attempt)) input.setState({ status: 'success', data, error: null });
  } catch (error: unknown) {
    handleRequestFailure(input, attempt, error);
  } finally {
    window.clearTimeout(attempt.timeout);
  }
}

function startRequest<TInput, TOutput>(input: ExecuteRequestInput<TInput, TOutput>) {
  input.refs.controller.current?.abort();
  const controller = new AbortController();
  const id = ++input.refs.id.current;
  input.refs.controller.current = controller;
  const timeout = window.setTimeout(() => {
    controller.abort();
    if (isCurrentAttempt(input, id)) input.setState({
      status: 'error', data: null, error: 'A solicitação excedeu o tempo limite. Tente novamente.',
    });
  }, input.timeoutMs);

  return { id, controller, timeout };
}

function handleRequestFailure<TInput, TOutput>(
  input: ExecuteRequestInput<TInput, TOutput>,
  attempt: { id: number; controller: AbortController; timeout: number },
  error: unknown,
): void {
  if (!isCurrentAttempt(input, attempt.id)) return;
  if (error instanceof ApiRequestError && error.status === 401) input.invalidateSession();

  const message = attempt.controller.signal.aborted
    ? 'A solicitação excedeu o tempo limite. Tente novamente.'
    : getSafeRequestError(error);
  input.setState({ status: 'error', data: null, error: message });
}

function isCurrentRequest<TInput, TOutput>(
  input: ExecuteRequestInput<TInput, TOutput>,
  attempt: { id: number; controller: AbortController },
): boolean {
  return isCurrentAttempt(input, attempt.id) && !attempt.controller.signal.aborted;
}

function isCurrentAttempt<TInput, TOutput>(input: ExecuteRequestInput<TInput, TOutput>, id: number): boolean {
  return input.refs.id.current === id && input.refs.generation.current === input.generation;
}

function abortRequest(controller: MutableRefObject<AbortController | null>): void {
  controller.current?.abort();
  controller.current = null;
}

function getSafeRequestError(error: unknown): string {
  return error instanceof ApiRequestError
    ? error.apiError.message
    : 'Não foi possível conectar ao serviço. Tente novamente.';
}
