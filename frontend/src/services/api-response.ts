import type { MessageResponse } from '../types/message-response';
import type { SessionResponse } from '../types/api';

export function readMessageResponse(value: unknown): MessageResponse {
  if (!isRecord(value) || typeof value.message !== 'string') {
    throw new Error('Resposta de mensagem inválida.');
  }

  return { message: value.message };
}

export function readSessionResponse(value: unknown): SessionResponse {
  if (!isRecord(value) || typeof value.sessionId !== 'string' ||
    typeof value.expiresAt !== 'string' || typeof value.serverTime !== 'string') {
    throw new Error('Resposta de sessão inválida.');
  }

  return { sessionId: value.sessionId, expiresAt: value.expiresAt, serverTime: value.serverTime };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
