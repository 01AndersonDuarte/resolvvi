import type { RequestFailure } from '../types/api';

type AuthOperation = 'login' | 'registration';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos. Confira os dados e tente novamente.',
  ACCOUNT_ALREADY_EXISTS: 'Já existe uma conta com esse e-mail. Entre com sua senha.',
};

const FALLBACK_MESSAGES: Record<AuthOperation, string> = {
  login: 'Não foi possível entrar agora. Tente novamente.',
  registration: 'Não foi possível concluir o cadastro agora. Tente novamente.',
};

export function getAuthErrorMessage(operation: AuthOperation, failure: RequestFailure | null): string {
  if (failure?.error.field !== null && failure?.error.field !== undefined) return failure.error.message;

  const code = failure?.error.code;
  return code === undefined ? FALLBACK_MESSAGES[operation] : ERROR_MESSAGES[code] ?? FALLBACK_MESSAGES[operation];
}
