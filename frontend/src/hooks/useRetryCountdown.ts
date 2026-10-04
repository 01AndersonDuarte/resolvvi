import { useEffect, useState } from 'react';

const CLOCK_INTERVAL_MS = 250;

export function useRetryCountdown(seconds: number | null, resetKey: unknown = seconds): number {
  const [clock, setClock] = useState({ key: null as unknown, remaining: 0 });

  useEffect(() => {
    if (seconds === null || seconds <= 0) return;

    const deadline = Date.now() + seconds * 1_000;
    const update = () => setClock({
      key: resetKey,
      remaining: Math.max(0, Math.ceil((deadline - Date.now()) / 1_000)),
    });
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, CLOCK_INTERVAL_MS);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [resetKey, seconds]);

  if (seconds === null || seconds <= 0) return 0;

  return clock.key === resetKey ? clock.remaining : seconds;
}
