const ACTIVE_SESSION_KEY = 'process.activeSession';
const INPUT_KEY_PREFIX = 'process.cnj.';

export function readProcessInput(sessionId: string): string {
  const storage = getSessionStorage();
  if (storage === null) return '';

  try {
    const activeSession = storage.getItem(ACTIVE_SESSION_KEY);
    if (activeSession !== null && activeSession !== sessionId) storage.removeItem(getInputKey(activeSession));
    storage.setItem(ACTIVE_SESSION_KEY, sessionId);
    return storage.getItem(getInputKey(sessionId)) ?? '';
  } catch {
    return '';
  }
}

export function saveProcessInput(sessionId: string, cnj: string): void {
  const storage = getSessionStorage();
  if (storage === null) return;

  try {
    storage.setItem(ACTIVE_SESSION_KEY, sessionId);
    storage.setItem(getInputKey(sessionId), cnj);
  } catch {
    return;
  }
}

export function clearProcessInput(): void {
  const storage = getSessionStorage();
  if (storage === null) return;

  try {
    const activeSession = storage.getItem(ACTIVE_SESSION_KEY);
    if (activeSession !== null) storage.removeItem(getInputKey(activeSession));
    storage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    return;
  }
}

function getInputKey(sessionId: string): string {
  return `${INPUT_KEY_PREFIX}${sessionId}`;
}

function getSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
