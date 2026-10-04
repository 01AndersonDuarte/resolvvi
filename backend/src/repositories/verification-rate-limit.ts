const WINDOW_MS = 60 * 60 * 1000;
const MINIMUM_INTERVAL_MS = 60 * 1000;
const MAX_WINDOW_EMISSIONS = 5;

export function getEmissionRetryAfter(emissions: { issuedAt: Date }[], now: Date): number {
  const latest = emissions.at(-1)?.issuedAt;
  const intervalWait = latest ? latest.getTime() + MINIMUM_INTERVAL_MS - now.getTime() : 0;
  const windowWait = emissions.length >= MAX_WINDOW_EMISSIONS
    ? (emissions[0]?.issuedAt.getTime() ?? now.getTime()) + WINDOW_MS - now.getTime()
    : 0;
  const waitMs = Math.max(intervalWait, windowWait);
  return waitMs > 0 ? Math.ceil(waitMs / 1000) : 0;
}
