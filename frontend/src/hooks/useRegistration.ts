import type { FormEvent } from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthErrorMessage, getRetryAfterSeconds } from '../services/auth-feedback';
import { registerAccount } from '../services/auth-service';
import { useCredentialFields } from './useAuthFields';
import { useAuthRequest } from './useAuthRequest';
import { useRetryCountdown } from './useRetryCountdown';

export function useRegistration(initialEmail = '') {
  const fields = useCredentialFields('registration', initialEmail);
  const request = useAuthRequest(registerAccount);
  const navigate = useNavigate();
  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (request.state.status === 'pending') return;
    const input = fields.validate();
    if (input === null) return;

    const result = await request.run(input);
    if (result.status === 'success') {
      navigate('/confirmacao-pendente', { state: { email: input.email, reason: 'registration' } });
    } else if (result.status === 'error') {
      fields.applyFailure(result.failure);
      if (result.failure?.error.code === 'VERIFICATION_RATE_LIMITED') fields.clearPassword();
    }
  }, [fields, navigate, request]);
  const retrySeconds = request.state.status === 'error' ? getRetryAfterSeconds(request.state.failure) : null;
  const remainingSeconds = useRetryCountdown(retrySeconds, request.state.status === 'error' ? request.state.failure : null);
  const errorMessage = request.state.status === 'error' && request.state.failure?.error.field == null
    ? getRegistrationErrorMessage(request.state.failure)
    : null;

  return { fields, state: request.state, submit, errorMessage, remainingSeconds };
}

function getRegistrationErrorMessage(failure: Parameters<typeof getAuthErrorMessage>[1]): string {
  if (failure !== null) return getAuthErrorMessage('registration', failure);

  return 'Não foi possível concluir o cadastro agora. Tente novamente. Se o resultado for desconhecido, confira sua caixa de entrada; você também pode entrar ou solicitar outra confirmação.';
}
