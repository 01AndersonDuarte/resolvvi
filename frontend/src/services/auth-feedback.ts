import type { RequestFailure } from '../types/api';

type AuthOperation = 'confirmation' | 'login' | 'registration' | 'resend';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos. Confira os dados e tente novamente.',
  EMAIL_UNCONFIRMED: 'Confirme seu e-mail para entrar.',
  VERIFICATION_INVALID: 'Este link não é mais válido. Solicite outra confirmação ou entre se já confirmou seu e-mail.',
  VERIFICATION_RATE_LIMITED: 'Aguarde para solicitar outro e-mail.',
  CONFIRMATION_SEND_FAILED: 'Não foi possível enviar a confirmação agora. Tente reenviar.',
  CONFIRMATION_SEND_UNKNOWN: 'Não foi possível confirmar o envio. Confira seu e-mail; se a mensagem não chegar, tente reenviar.',
};

const FALLBACK_MESSAGES: Record<AuthOperation, string> = {
  login: 'Não foi possível entrar agora. Tente novamente.',
  registration: 'Não foi possível concluir o cadastro agora. Tente novamente.',
  confirmation: 'Não foi possível concluir a confirmação agora. Abra o link novamente ou tente entrar se já confirmou seu e-mail.',
  resend: 'Não foi possível solicitar outra confirmação agora. Tente novamente.',
};

export function getAuthErrorMessage(operation: AuthOperation, failure: RequestFailure | null): string {
  if (failure?.error.field !== null && failure?.error.field !== undefined) return failure.error.message;

  const code = failure?.error.code;
  return code === undefined ? FALLBACK_MESSAGES[operation] : ERROR_MESSAGES[code] ?? FALLBACK_MESSAGES[operation];
}

export function getRetryAfterSeconds(failure: RequestFailure | null): number | null {
  if (failure?.error.code !== 'VERIFICATION_RATE_LIMITED') return null;

  return failure.error.retryAfterSeconds;
}
