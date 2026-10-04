import type { SessionResponse } from '../types/api';
import { readSessionResponse } from './api-response';
import { requestJson } from './http-client';

export function fetchSession(signal?: AbortSignal): Promise<SessionResponse> {
  return requestJson<unknown>('/api/auth/session', { signal }).then(readSessionResponse);
}

export function revokeSession(signal?: AbortSignal): Promise<void> {
  return requestJson<void>('/api/auth/logout', { method: 'POST', body: {}, signal });
}
