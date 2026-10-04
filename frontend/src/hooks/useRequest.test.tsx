import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../services/http-client';
import type { ApiError } from '../types/api';
import type { RequestRunResult } from './useRequest';
import { useRequest } from './useRequest';

type Deferred<TValue> = {
  promise: Promise<TValue>;
  resolve: (value: TValue) => void;
};

const RATE_LIMIT_ERROR: ApiError = {
  code: 'VERIFICATION_RATE_LIMITED',
  message: 'Aguarde para solicitar outro e-mail.',
  field: null,
  retryAfterSeconds: 42,
};

afterEach(() => vi.useRealTimers());

describe('useRequest structured results', () => {
  it('recusa uma execução duplicada enquanto a primeira continua pendente', async () => {
    const deferred = createDeferred<string>();
    const request = vi.fn(() => deferred.promise);
    const { result } = renderHook(() => useRequest(request, requestOptions()));
    let firstRun!: Promise<RequestRunResult<string>>;

    act(() => { firstRun = result.current.run('first'); });
    const duplicateResult = await result.current.run('duplicate');

    expect(duplicateResult).toEqual({ status: 'stale' });
    expect(request).toHaveBeenCalledOnce();
    expect(result.current.state.status).toBe('pending');

    await act(async () => { deferred.resolve('done'); await firstRun; });
    expect(result.current.state).toMatchObject({ status: 'success', data: 'done' });
  });

  it('preserva o ApiError 429 e o Retry-After no resultado estruturado', async () => {
    const failure = new ApiRequestError('rate limited', 429, RATE_LIMIT_ERROR);
    const request = vi.fn((): Promise<string> => Promise.reject(failure));
    const { result } = renderHook(() => useRequest<string, string>(request, requestOptions()));
    let runResult!: RequestRunResult<string>;

    await act(async () => { runResult = await result.current.run('email'); });

    expect(runResult).toEqual({
      status: 'error',
      error: RATE_LIMIT_ERROR.message,
      failure: { status: 429, error: RATE_LIMIT_ERROR },
    });
    expect(result.current.state).toMatchObject({
      status: 'error',
      failure: { status: 429, error: { retryAfterSeconds: 42 } },
    });
  });

  it('retorna timeout estruturado e executa a recuperação uma única vez', async () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const request = vi.fn((_input: string, signal: AbortSignal) => abortableRequest(signal));
    const options = { ...requestOptions(), timeoutMs: 1_000, onTimeout };
    const { result } = renderHook(() => useRequest(request, options));
    let pending!: Promise<RequestRunResult<string>>;
    let runResult!: RequestRunResult<string>;

    act(() => { pending = result.current.run('slow'); });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
      runResult = await pending;
    });

    expect(runResult).toEqual({
      status: 'error',
      error: 'A solicitação excedeu o tempo limite. Tente novamente.',
      failure: null,
    });
    expect(onTimeout).toHaveBeenCalledOnce();
    expect(result.current.state.status).toBe('error');
  });

  it('devolve stale e ignora o resultado quando a geração muda', async () => {
    const deferred = createDeferred<string>();
    const request = vi.fn(() => deferred.promise);
    const { result, rerender } = renderHook(
      ({ generation }) => useRequest(request, requestOptions(generation)),
      { initialProps: { generation: 1 } },
    );
    let pending!: Promise<RequestRunResult<string>>;
    let runResult!: RequestRunResult<string>;

    act(() => { pending = result.current.run('old'); });
    rerender({ generation: 2 });
    await act(async () => { deferred.resolve('late'); runResult = await pending; });

    expect(runResult).toEqual({ status: 'stale' });
    expect(result.current.state.status).toBe('idle');
  });
});

function createDeferred<TValue>(): Deferred<TValue> {
  let resolve!: (value: TValue) => void;
  const promise = new Promise<TValue>((complete) => { resolve = complete; });

  return { promise, resolve };
}

function requestOptions(generation = 0) {
  return { generation, invalidateSession: vi.fn() };
}

function abortableRequest(signal: AbortSignal): Promise<string> {
  return new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });
}
