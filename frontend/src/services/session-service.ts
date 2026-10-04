import type { SessionResponse } from '../types/api';
import { requestJson } from './http-client';

export function fetchSession(signal?: AbortSignal): Promise<SessionResponse> {
  return requestJson<unknown>('/api/auth/session', { signal }).then(readSessionResponse);
}

export function revokeSession(signal?: AbortSignal): Promise<void> {
  return requestJson<void>('/api/auth/logout', { method: 'POST', body: {}, signal });
}

function readSessionResponse(value: unknown): SessionResponse {
  if (!isRecord(value) || typeof value.sessionId !== 'string' ||
    typeof value.expiresAt !== 'string' || typeof value.serverTime !== 'string') {
    throw new Error('Resposta de sessão inválida.');
  }

  return { sessionId: value.sessionId, expiresAt: value.expiresAt, serverTime: value.serverTime };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
