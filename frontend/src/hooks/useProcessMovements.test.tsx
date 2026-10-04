import { act, renderHook, waitFor } from '@testing-library/react';
import { useCallback, useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../contexts/auth-context';
import { ApiRequestError } from '../services/http-client';
import type { MovementPage } from '../types/movement-page';
import { useProcessMovements } from './useProcessMovements';

const api = vi.hoisted(() => ({ getProcessMovements: vi.fn() }));
vi.mock('../services/process-service', () => ({ getProcessMovements: api.getProcessMovements }));

afterEach(() => {
  vi.useRealTimers();
  api.getProcessMovements.mockReset();
});

describe('useProcessMovements', () => {
  it('keeps the confirmed page when a destination fails and retries that destination', async () => {
    api.getProcessMovements.mockResolvedValueOnce(pageOne).mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(pageTwo);
    const { result } = renderHook(() => useProcessMovements('17'), { wrapper: SessionWrapper });
    await waitFor(() => expect(result.current.page?.page).toBe(1));

    await act(async () => { await result.current.loadPage(2); });
    expect(result.current.page).toEqual(pageOne);
    expect(result.current.errorMessage).toContain('conectar');

    await act(async () => { await result.current.retry(); });
    expect(result.current.page).toEqual(pageTwo);
    expect(api.getProcessMovements).toHaveBeenLastCalledWith({ processId: '17', page: 2 }, expect.any(AbortSignal));
  });

  it('keeps the confirmed page visible when a timed out transport remains pending', async () => {
    vi.useFakeTimers();
    api.getProcessMovements.mockResolvedValueOnce(pageOne).mockImplementationOnce(() => new Promise(() => undefined));
    const { result } = renderHook(() => useProcessMovements('17'), { wrapper: SessionWrapper });
    await act(async () => { await Promise.resolve(); });
    expect(result.current.page).toEqual(pageOne);

    act(() => { void result.current.loadPage(2); });
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(result.current.pending).toBe(false);
    expect(result.current.page).toEqual(pageOne);
    expect(result.current.errorMessage).toContain('concluir');
  });

  it('discards an old process response after cancellation', async () => {
    let resolvePage: (value: MovementPage) => void = () => undefined;
    api.getProcessMovements.mockImplementationOnce(() => new Promise((resolve) => { resolvePage = resolve; }))
      .mockResolvedValueOnce(pageTwo);
    const { result, rerender } = renderHook(({ id }) => useProcessMovements(id), {
      initialProps: { id: '17' },
      wrapper: SessionWrapper,
    });
    rerender({ id: '18' });
    await waitFor(() => expect(api.getProcessMovements).toHaveBeenCalledWith({ processId: '18', page: 1 }, expect.any(AbortSignal)));
    await act(async () => { resolvePage(pageOne); await Promise.resolve(); });
    await waitFor(() => expect(result.current.page).toBeNull());
  });

  it('aborts the active page request when the hook unmounts', () => {
    let requestSignal: AbortSignal | undefined;
    api.getProcessMovements.mockImplementationOnce((_input, signal: AbortSignal) => {
      requestSignal = signal;
      return new Promise(() => undefined);
    });
    const { unmount } = renderHook(() => useProcessMovements('17'), { wrapper: SessionWrapper });

    unmount();

    expect(requestSignal?.aborted).toBe(true);
  });

  it('invalidates the session and drops the local snapshot when access expires', async () => {
    api.getProcessMovements.mockResolvedValueOnce(pageOne).mockRejectedValueOnce(new ApiRequestError('expired', 401, {
      code: 'SESSION_INVALID', message: 'Entre novamente.', field: null, retryAfterSeconds: null,
    }));
    const { result } = renderHook(() => useProcessMovements('17'), { wrapper: SessionWrapper });
    await waitFor(() => expect(result.current.page?.page).toBe(1));
    await act(async () => { await result.current.loadPage(2); });

    expect(result.current.page).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it('signals a missing process so its details can be revalidated', async () => {
    const onMissing = vi.fn();
    api.getProcessMovements.mockRejectedValueOnce(new ApiRequestError('missing', 404, {
      code: 'PROCESS_NOT_FOUND', message: 'missing', field: null, retryAfterSeconds: null,
    }));
    const { result } = renderHook(() => useProcessMovements('17', onMissing), { wrapper: SessionWrapper });
    await waitFor(() => expect(result.current.processMissing).toBe(true));
    expect(onMissing).toHaveBeenCalledOnce();
    expect(result.current.errorMessage).toContain('Não encontramos');
  });
});

function SessionWrapper({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ generation: number; status: 'authenticated' | 'anonymous' }>({
    generation: 0,
    status: 'authenticated',
  });
  const invalidate = useCallback(() => setSession({ generation: session.generation + 1, status: 'anonymous' }), [session.generation]);
  const value = {
    state: { status: session.status, session: null, generation: session.generation, message: null },
    refresh: vi.fn(),
    completeLogin: vi.fn(),
    logout: vi.fn(async () => true),
    invalidate,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const pageOne: MovementPage = {
  processId: 17,
  items: [{ id: 1, movementDate: '05/12/2023', movementTitle: 'A', movementContent: null }],
  page: 1,
  pageSize: 20,
  total: 21,
  totalPages: 2,
};

const pageTwo: MovementPage = { ...pageOne, items: [{ ...pageOne.items[0], id: 2 }], page: 2 };
