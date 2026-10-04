export type PendingReason = 'login' | 'registration';

export type AuthNavigationState = {
  email?: string;
  reason?: PendingReason;
};

export function readAuthNavigationState(value: unknown): AuthNavigationState {
  if (!isRecord(value)) return {};

  const email = typeof value.email === 'string' ? value.email : undefined;
  const reason = value.reason === 'login' || value.reason === 'registration' ? value.reason : undefined;
  return { email, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
