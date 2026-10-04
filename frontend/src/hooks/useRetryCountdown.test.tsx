import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRetryCountdown } from './useRetryCountdown';

describe('useRetryCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T12:00:00.000Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('reduz a espera até zero usando o prazo recebido', async () => {
    const { result } = renderHook(() => useRetryCountdown(3, 'first-limit'));

    expect(result.current).toBe(3);

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(result.current).toBe(2);

    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    expect(result.current).toBe(0);
  });

  it('reinicia um novo limite 429 mesmo quando a espera tem a mesma duração', async () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => useRetryCountdown(2, resetKey),
      { initialProps: { resetKey: 'first-response' } },
    );

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(result.current).toBe(1);

    rerender({ resetKey: 'second-response' });
    expect(result.current).toBe(2);

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(result.current).toBe(1);
  });

  it('encerra o contador quando a espera deixa de existir', async () => {
    const { result, rerender } = renderHook(
      ({ seconds }) => useRetryCountdown(seconds, seconds),
      { initialProps: { seconds: 2 as number | null } },
    );

    await act(async () => vi.advanceTimersByTimeAsync(250));
    rerender({ seconds: null });

    expect(result.current).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
