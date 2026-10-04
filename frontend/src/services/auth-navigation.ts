export type AuthNavigationState = {
  email?: string;
  registrationCompleted?: boolean;
};

export function readAuthNavigationState(value: unknown): AuthNavigationState {
  if (!isRecord(value)) return {};

  const email = typeof value.email === 'string' ? value.email : undefined;
  const registrationCompleted = value.registrationCompleted === true;
  return { email, registrationCompleted };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
