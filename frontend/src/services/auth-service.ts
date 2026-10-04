import type { AuthCredentials } from '../types/auth-credentials';
import type { EmailAddressInput } from '../types/email-address-input';
import type { MessageResponse } from '../types/message-response';
import type { SessionResponse } from '../types/api';
import { requestJson } from './http-client';
import { readMessageResponse, readSessionResponse } from './api-response';

export function registerAccount(input: AuthCredentials, signal: AbortSignal): Promise<MessageResponse> {
  return requestJson<unknown>('/api/auth/register', {
    method: 'POST', body: input, signal,
  }).then(readMessageResponse);
}

export function loginAccount(input: AuthCredentials, signal: AbortSignal): Promise<SessionResponse> {
  return requestJson<unknown>('/api/auth/login', {
    method: 'POST', body: input, signal,
  }).then(readSessionResponse);
}

export function resendVerification(input: EmailAddressInput, signal: AbortSignal): Promise<MessageResponse> {
  return requestJson<unknown>('/api/auth/resend-verification', {
    method: 'POST', body: input, signal,
  }).then(readMessageResponse);
}

export function confirmEmail(token: string, signal: AbortSignal): Promise<MessageResponse> {
  return requestJson<unknown>('/api/auth/verify-email', {
    method: 'POST', body: { token }, signal,
  }).then(readMessageResponse);
}
