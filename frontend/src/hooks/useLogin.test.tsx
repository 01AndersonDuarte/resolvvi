import type { FormEvent, ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../contexts/auth-context';
import type { AuthContextValue } from '../contexts/auth-context';
import type { SessionResponse } from '../types/api';
import { useLogin } from './useLogin';

const { loginAccountMock } = vi.hoisted(() => ({ loginAccountMock: vi.fn() }));

vi.mock('../services/auth-service', () => ({ loginAccount: loginAccountMock }));

type Deferred<TValue> = {
  promise: Promise<TValue>;
  resolve: (value: TValue) => void;
};

afterEach(() => {
  vi.useRealTimers();
  loginAccountMock.mockReset();
});

describe('useLogin', () => {
  it('revoga a sessão possível e ignora um sucesso recebido após o timeout', async () => {
    vi.useFakeTimers();
    const deferred = createDeferred<SessionResponse>();
    const capturedSignal: { value: AbortSignal | null } = { value: null };
    loginAccountMock.mockImplementation((_input, signal: AbortSignal) => {
      capturedSignal.value = signal;
      return deferred.promise;
    });
    const context = createAuthContext();
    const wrapper = createWrapper(context);
    const { result } = renderHook(() => useLogin(), { wrapper });
    let submission!: Promise<void>;

    act(() => {
      result.current.fields.setEmail('pessoa@example.com');
      result.current.fields.setPassword('senha válida');
    });
    act(() => { submission = result.current.submit(createSubmitEvent()); });

    await act(async () => vi.advanceTimersByTimeAsync(15_000));
    expect(capturedSignal.value?.aborted).toBe(true);
    expect(context.logout).toHaveBeenCalledOnce();
    expect(result.current.state.status).toBe('error');

    await act(async () => {
      deferred.resolve({
        sessionId: 'late-session',
        expiresAt: '2026-10-04T20:00:00.000Z',
        serverTime: '2026-10-04T12:00:00.000Z',
      });
      await submission;
    });

    expect(context.completeLogin).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe('error');
  });
});

function createAuthContext(): AuthContextValue {
  return {
    state: { status: 'anonymous', session: null, generation: 0, message: null },
    refresh: vi.fn(),
    completeLogin: vi.fn(),
    logout: vi.fn().mockResolvedValue(true),
    invalidate: vi.fn(),
  };
}

function createWrapper(context: AuthContextValue) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter>
        <AuthContext.Provider value={context}>{children}</AuthContext.Provider>
      </MemoryRouter>
    );
  };
}

function createSubmitEvent(): FormEvent<HTMLFormElement> {
  return { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
}

function createDeferred<TValue>(): Deferred<TValue> {
  let resolve!: (value: TValue) => void;
  const promise = new Promise<TValue>((complete) => { resolve = complete; });

  return { promise, resolve };
}
