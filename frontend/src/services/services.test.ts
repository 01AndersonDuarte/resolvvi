import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_SESSION_STATE, sessionReducer } from '../contexts/session-state';
import { ApiRequestError, requestJson } from './http-client';
import { fetchSession, revokeSession } from './session-service';
import { announceInvalidation, announceLogout, clearPendingLogoutMarker, invalidateSession, isInvalidationEvent, isLogoutEvent, isSessionInvalid, receiveLogout, restoreSession, revalidateSession, signOut } from './session-runtime';

const validSession = { sessionId: 'session-1', expiresAt: '2030-01-01T01:00:00.000Z', serverTime: '2030-01-01T00:00:00.000Z' };

afterEach(() => localStorage.clear());

describe('session reducer', () => {
  it('authenticates, preserves generation for same session, and advances for a new session', () => {
    const authenticated = sessionReducer(INITIAL_SESSION_STATE, { type: 'verified', session: { ...validSession, receivedAt: 10 } });
    expect(authenticated.status).toBe('authenticated');
    expect(authenticated.generation).toBe(1);
    expect(sessionReducer(authenticated, { type: 'verified', session: { ...validSession, receivedAt: 20 } }).generation).toBe(1);
    expect(sessionReducer(authenticated, { type: 'verified', session: { ...validSession, sessionId: 'session-2', receivedAt: 20 } }).generation).toBe(2);
  });

  it.each([
    [{ type: 'anonymous' } as const, 'anonymous'],
    [{ type: 'unavailable', message: 'offline' } as const, 'unavailable'],
    [{ type: 'logout-pending', message: 'retry' } as const, 'logout-pending'],
    [{ type: 'logout-started' } as const, 'logout-pending'],
    [{ type: 'logout-completed' } as const, 'anonymous'],
  ])('transitions state for action %s', (action, status) => {
    expect(sessionReducer(INITIAL_SESSION_STATE, action).status).toBe(status);
  });

  it('clears protected session and increments generation when checking again', () => {
    const authenticated = sessionReducer(INITIAL_SESSION_STATE, { type: 'verified', session: { ...validSession, receivedAt: 10 } });
    const checking = sessionReducer(authenticated, { type: 'checking' });
    expect(checking).toMatchObject({ status: 'checking', session: null, generation: 2 });
  });
});

describe('API client and session service', () => {
  it('sends same-origin credentialed requests and parses successful responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    await expect(requestJson('/api/example', { method: 'POST', body: { q: 'abc' } })).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith('/api/example', expect.objectContaining({ credentials: 'include', cache: 'no-store', body: '{"q":"abc"}' }));
  });

  it('supports empty responses and uses a safe fallback for malformed API errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(new Response('bad', { status: 503 })));
    await expect(requestJson('/api/logout')).resolves.toBeUndefined();
    const failure = await requestJson('/api/failure').catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiRequestError);
    expect((failure as ApiRequestError).apiError.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('preserves valid API errors and validates session responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'BAD_INPUT', message: 'Revise os dados.', field: 'email', retryAfterSeconds: null } }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(validSession), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sessionId: 3 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 })));
    const error = await requestJson('/api/failure').catch((caught: unknown) => caught);
    expect((error as ApiRequestError).apiError).toMatchObject({ code: 'BAD_INPUT', field: 'email' });
    await expect(fetchSession()).resolves.toEqual(validSession);
    await expect(fetchSession()).rejects.toThrow('Resposta de sessão inválida.');
    await expect(revokeSession()).resolves.toBeUndefined();
  });
});

describe('session runtime', () => {
  const ops = {
    fetchSession: vi.fn().mockResolvedValue(validSession),
    revokeSession: vi.fn().mockResolvedValue(undefined),
  };

  it('restores a valid session and revalidates with checking first', async () => {
    const dispatch = vi.fn();
    await restoreSession(dispatch, new AbortController().signal, ops);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'verified', session: expect.objectContaining({ sessionId: 'session-1' }) }));
    dispatch.mockClear();
    await revalidateSession(dispatch, new AbortController().signal, ops);
    expect(dispatch.mock.calls[0][0]).toEqual({ type: 'checking' });
  });

  it('retries an interrupted logout during restoration and marks failed sign-outs pending', async () => {
    localStorage.setItem('auth.pendingLogout', 'true');
    const dispatch = vi.fn();
    const retryOps = { fetchSession: vi.fn().mockResolvedValue(validSession), revokeSession: vi.fn().mockResolvedValue(undefined) };
    await restoreSession(dispatch, new AbortController().signal, retryOps);
    expect(retryOps.revokeSession).toHaveBeenCalledOnce();
    expect(localStorage.getItem('auth.pendingLogout')).toBeNull();
    const failed = await signOut(dispatch, new AbortController().signal, ops);
    expect(failed).toBe(true);
    const failOps = { fetchSession: ops.fetchSession, revokeSession: vi.fn().mockRejectedValue(new Error('offline')) };
    const result = await signOut(dispatch, new AbortController().signal, failOps);
    expect(result).toBe(false);
    expect(dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'logout-pending' }));
  });

  it('keeps a failed interrupted logout pending and avoids remote checks until it succeeds', async () => {
    localStorage.setItem('auth.pendingLogout', 'true');
    const dispatch = vi.fn();
    const failedOps = { fetchSession: vi.fn().mockResolvedValue(validSession), revokeSession: vi.fn().mockRejectedValue(new Error('offline')) };
    await restoreSession(dispatch, new AbortController().signal, failedOps);
    expect(failedOps.fetchSession).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'logout-pending' }));
    dispatch.mockClear();
    await revalidateSession(dispatch, new AbortController().signal, failedOps);
    expect(failedOps.fetchSession).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'logout-pending' }));
  });

  it('handles invalid, unavailable, and aborted remote session results safely', async () => {
    const dispatch = vi.fn();
    const invalidOps = { fetchSession: vi.fn().mockRejectedValue(new ApiRequestError('expired', 401, {
      code: 'SESSION_INVALID', message: 'expired', field: null, retryAfterSeconds: null,
    })), revokeSession: vi.fn() };
    await restoreSession(dispatch, new AbortController().signal, invalidOps);
    expect(dispatch).toHaveBeenCalledWith({ type: 'anonymous' });
    const unavailableOps = { fetchSession: vi.fn().mockRejectedValue(new Error('offline')), revokeSession: vi.fn() };
    await restoreSession(dispatch, new AbortController().signal, unavailableOps);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'unavailable' }));
    const controller = new AbortController();
    controller.abort();
    dispatch.mockClear();
    await restoreSession(dispatch, controller.signal, { fetchSession: vi.fn().mockResolvedValue(validSession), revokeSession: vi.fn() });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('announces logout and invalidation, with storage fallback when channels are unavailable', async () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    const dispatch = vi.fn();
    announceLogout();
    announceInvalidation();
    invalidateSession(dispatch);
    expect(localStorage.getItem('auth.sessionInvalidated')).toMatch(/\d+/);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'anonymous' }));
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    announceInvalidation();
    storageSpy.mockRestore();

    class FakeChannel {
      static posted: unknown;
      constructor() { /* channel stub */ }
      postMessage(value: unknown) { FakeChannel.posted = value; }
      close() { return undefined; }
    }
    vi.stubGlobal('BroadcastChannel', FakeChannel);
    announceLogout();
    expect(FakeChannel.posted).toEqual({ type: 'logout' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await receiveLogout(dispatch, new AbortController().signal);
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'logout-completed' });
    clearPendingLogoutMarker();
    expect(localStorage.getItem('auth.pendingLogout')).toBeNull();
  });

  it('classifies event payloads and invalid session errors', () => {
    const invalid = new ApiRequestError('expired', 401, { code: 'SESSION_INVALID', message: 'expired', field: null, retryAfterSeconds: null });
    expect(isSessionInvalid(invalid)).toBe(true);
    expect(isSessionInvalid(new Error('x'))).toBe(false);
    expect(isInvalidationEvent({ type: 'invalidate' })).toBe(true);
    expect(isInvalidationEvent({ type: 'other' })).toBe(false);
    expect(isLogoutEvent({ type: 'logout' })).toBe(true);
    expect(isLogoutEvent(null)).toBe(false);
  });
});
