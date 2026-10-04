import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../contexts/AuthProvider';
import { INITIAL_SESSION_STATE } from '../contexts/session-state';
import { useSession } from './useSession';
import { useSessionActions } from './useSessionActions';
import { useSessionEvents } from './useSessionEvents';
import { useSessionRefresh } from './useSessionRefresh';

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('session context and actions', () => {
  it('requires the session provider', () => {
    expect(() => renderHook(() => useSession())).toThrow('useSession precisa estar dentro de AuthProvider.');
  });

  it('completes login, invalidates, and retries logout without storing session identifiers', async () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const dispatch = vi.fn();
    const { result } = renderHook(() => useSessionActions(dispatch));
    act(() => result.current.completeLogin({ sessionId: 'secret-session-id', expiresAt: '2030-01-01', serverTime: '2030-01-01' }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'verified' }));
    expect(localStorage.getItem('auth.pendingLogout')).toBeNull();
    act(() => result.current.invalidate());
    expect(localStorage.getItem('auth.sessionInvalidated')).toMatch(/\d+/);
    await act(async () => { await result.current.logout(); });
    expect(localStorage.getItem('auth.pendingLogout')).toBeNull();
    expect(localStorage.getItem('secret-session-id')).toBeNull();
  });

  it('boots the provider with a remote session and cleans up on unmount', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      sessionId: 's1', expiresAt: '2030-01-01T01:00:00Z', serverTime: '2030-01-01T00:00:00Z',
    }), { status: 200 })));
    const { result } = renderHook(() => useSession(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.state.status).toBe('authenticated'));
  });

  it('revalidates on demand and does not refresh while logout is pending', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'SESSION_INVALID', message: 'expired', field: null, retryAfterSeconds: null },
    }), { status: 401 })));
    const dispatch = vi.fn();
    const { result, rerender } = renderHook(({ state }) => useSessionRefresh(state, dispatch), { initialProps: { state: INITIAL_SESSION_STATE } });
    act(() => result.current());
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'checking' }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'anonymous' }));
    const pending = { ...INITIAL_SESSION_STATE, status: 'logout-pending' as const };
    rerender({ state: pending });
    vi.mocked(fetch).mockClear();
    act(() => result.current());
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('cross-tab and browser lifecycle events', () => {
  it('rechecks on BFCache return and after the page becomes visible again', () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    const dispatch = vi.fn();
    const refresh = vi.fn();
    renderHook(() => useSessionEvents('authenticated', dispatch, refresh));
    act(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    expect(refresh).toHaveBeenCalledOnce();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(refresh).toHaveBeenCalledTimes(2);
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(dispatch).toHaveBeenCalledWith({ type: 'checking' });
  });

  it('handles invalidation and pending logout storage events and ignores duplicate logout', async () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const dispatch = vi.fn();
    const { rerender } = renderHook(({ status }) => useSessionEvents(status, dispatch, vi.fn()), { initialProps: { status: 'authenticated' } });
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'auth.sessionInvalidated' })));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'anonymous' }));
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'auth.pendingLogout' })));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'logout-completed' }));
    rerender({ status: 'logout-pending' });
    dispatch.mockClear();
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'auth.sessionInvalidated' })));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('listens to broadcast invalidation and closes the channel on cleanup', () => {
    class FakeChannel extends EventTarget {
      static instance: FakeChannel;
      closed = false;
      constructor() { super(); FakeChannel.instance = this; }
      postMessage() { return undefined; }
      close() { this.closed = true; }
    }
    vi.stubGlobal('BroadcastChannel', FakeChannel);
    const dispatch = vi.fn();
    const { unmount } = renderHook(() => useSessionEvents('authenticated', dispatch, vi.fn()));
    const message = new MessageEvent('message', { data: { type: 'invalidate' } });
    act(() => FakeChannel.instance.dispatchEvent(message));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'anonymous' }));
    unmount();
    expect(FakeChannel.instance.closed).toBe(true);
  });
});
