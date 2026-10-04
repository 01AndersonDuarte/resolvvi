import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_SESSION_STATE } from '../contexts/session-state';
import { ApiRequestError } from '../services/http-client';
import { useRequest } from './useRequest';
import { getRemainingSessionTime, useSessionExpiry } from './useSessionExpiry';

afterEach(() => vi.useRealTimers());

describe('useRequest', () => {
  it('reports pending and success states and supports cancellation', async () => {
    let resolveRequest: (value: string) => void = () => undefined;
    const request = vi.fn(() => new Promise<string>((resolve) => { resolveRequest = resolve; }));
    const { result } = renderHook(() => useRequest(request, { generation: 1, invalidateSession: vi.fn() }));
    let pending: Promise<void>;
    act(() => { pending = result.current.run('process'); });
    expect(result.current.state.status).toBe('pending');
    await act(async () => { resolveRequest('ready'); await pending; });
    expect(result.current.state).toEqual({ status: 'success', data: 'ready', error: null });
    act(() => result.current.cancel());
    expect(result.current.state.status).toBe('idle');
  });

  it('shows safe service errors and invalidates the session on 401', async () => {
    const invalidateSession = vi.fn();
    const request = vi.fn().mockRejectedValue(new ApiRequestError('private detail', 401, {
      code: 'SESSION_INVALID', message: 'Entre novamente.', field: null, retryAfterSeconds: null,
    }));
    const { result } = renderHook(() => useRequest(request, { generation: 0, invalidateSession }));
    await act(async () => { await result.current.run(null); });
    expect(result.current.state).toMatchObject({ status: 'error', error: 'Entre novamente.' });
    expect(invalidateSession).toHaveBeenCalledOnce();
    request.mockRejectedValueOnce(new Error('secret detail'));
    await act(async () => { await result.current.run(null); });
    expect(result.current.state).toMatchObject({ error: 'Não foi possível conectar ao serviço. Tente novamente.' });
  });

  it('replaces older results and aborts in-flight work when session generation changes', async () => {
    let resolveRequest: (value: string) => void = () => undefined;
    let capturedSignal: AbortSignal | undefined;
    const request = vi.fn((_input: string, signal: AbortSignal) => {
      capturedSignal = signal;
      return new Promise<string>((resolve) => { resolveRequest = resolve; });
    });
    const { result, rerender } = renderHook(({ generation }) => useRequest(request, { generation, invalidateSession: vi.fn() }), { initialProps: { generation: 1 } });
    let pending: Promise<void>;
    act(() => { pending = result.current.run('old'); });
    rerender({ generation: 2 });
    expect(capturedSignal?.aborted).toBe(true);
    expect(result.current.state.status).toBe('idle');
    await act(async () => { resolveRequest('stale'); await pending; });
    expect(result.current.state.status).toBe('idle');
  });

  it('shows timeout feedback when an operation exceeds its limit', async () => {
    vi.useFakeTimers();
    const request = vi.fn((_input: string, signal: AbortSignal) => new Promise<string>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const { result } = renderHook(() => useRequest(request, { generation: 0, timeoutMs: 50, invalidateSession: vi.fn() }));
    let pending: Promise<void>;
    act(() => { pending = result.current.run('slow'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(50); await pending; });
    expect(result.current.state).toMatchObject({ status: 'error', error: 'A solicitação excedeu o tempo limite. Tente novamente.' });
  });
});

describe('session expiry', () => {
  it('uses server lifetime minus time spent after the response', () => {
    expect(getRemainingSessionTime({ expiresAt: '2030-01-01T00:10:00Z', serverTime: '2030-01-01T00:00:00Z', receivedAt: 100 }, 400)).toBe(599_700);
    expect(getRemainingSessionTime({ expiresAt: 'bad', serverTime: 'bad', receivedAt: 10 }, 20)).toBe(0);
  });

  it('expires immediately when the session has elapsed', () => {
    const dispatch = vi.fn();
    const expired = { ...INITIAL_SESSION_STATE, status: 'authenticated' as const, session: {
      sessionId: 'a', expiresAt: '2020-01-01T00:00:00Z', serverTime: '2020-01-01T00:00:00Z', receivedAt: 0,
    } };
    renderHook(() => useSessionExpiry(expired, dispatch));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'anonymous' }));
  });
});
