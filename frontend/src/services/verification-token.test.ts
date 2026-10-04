import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureVerificationToken } from './verification-token';

afterEach(() => {
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

describe('verification token capture', () => {
  it('captures the token and removes the fragment while preserving path and query', () => {
    window.history.replaceState({ source: 'email' }, '', '/confirmar-email?campaign=acceptance#token=abc_DEF-123');

    expect(captureVerificationToken(window.location, window.history)).toBe('abc_DEF-123');
    expect(window.location.pathname).toBe('/confirmar-email');
    expect(window.location.search).toBe('?campaign=acceptance');
    expect(window.location.hash).toBe('');
    expect(window.history.state).toEqual({ source: 'email' });
  });

  it('removes the fragment before returning the captured token', () => {
    window.history.replaceState(null, '', '/confirmar-email#token=segredo');
    const replaceState = vi.spyOn(window.history, 'replaceState');

    const token = captureVerificationToken(window.location, window.history);

    expect(replaceState).toHaveBeenCalledOnce();
    expect(window.location.hash).toBe('');
    expect(token).toBe('segredo');
  });

  it.each([
    '/confirmar-email',
    '/confirmar-email#token=',
    '/confirmar-email#outro=valor',
  ])('returns no token and still clears confirmation fragments for %s', (path) => {
    window.history.replaceState(null, '', path);

    expect(captureVerificationToken(window.location, window.history)).toBeNull();
    expect(window.location.hash).toBe('');
  });

  it('does not trim or otherwise normalize token content', () => {
    window.history.replaceState(null, '', '/confirmar-email#token=%20abc_DEF%20');

    expect(captureVerificationToken(window.location, window.history)).toBe(' abc_DEF ');
  });

  it('does not read or remove a fragment outside the confirmation route', () => {
    window.history.replaceState(null, '', '/entrar#token=segredo');
    const replaceState = vi.spyOn(window.history, 'replaceState');

    expect(captureVerificationToken(window.location, window.history)).toBeNull();
    expect(window.location.hash).toBe('#token=segredo');
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('cannot capture the same fragment twice', () => {
    window.history.replaceState(null, '', '/confirmar-email#token=uso-unico');

    expect(captureVerificationToken(window.location, window.history)).toBe('uso-unico');
    expect(captureVerificationToken(window.location, window.history)).toBeNull();
  });
});
