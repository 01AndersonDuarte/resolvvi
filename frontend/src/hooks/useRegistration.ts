import type { FormEvent } from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthErrorMessage } from '../services/auth-feedback';
import { registerAccount } from '../services/auth-service';
import { useCredentialFields } from './useAuthFields';
import { useAuthRequest } from './useAuthRequest';

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
      navigate('/entrar', { state: { email: input.email, registrationCompleted: true } });
    } else if (result.status === 'error') {
      fields.applyFailure(result.failure);
    }
  }, [fields, navigate, request]);
  const errorMessage = request.state.status === 'error' && request.state.failure?.error.field == null
    ? getRegistrationErrorMessage(request.state.failure)
    : null;

  return { fields, state: request.state, submit, errorMessage };
}

function getRegistrationErrorMessage(failure: Parameters<typeof getAuthErrorMessage>[1]): string {
  if (failure !== null) return getAuthErrorMessage('registration', failure);

  return 'Não foi possível concluir o cadastro agora. Tente novamente.';
}
