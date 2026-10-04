import type { FormEvent } from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthErrorMessage } from '../services/auth-feedback';
import { loginAccount } from '../services/auth-service';
import { useCredentialFields } from './useAuthFields';
import { useAuthRequest } from './useAuthRequest';
import { useSession } from './useSession';

export function useLogin(initialEmail = '') {
  const fields = useCredentialFields('login', initialEmail);
  const { completeLogin, logout } = useSession();
  const recoverTimedOutLogin = useCallback(() => { void logout(); }, [logout]);
  const request = useAuthRequest(loginAccount, { onTimeout: recoverTimedOutLogin });
  const navigate = useNavigate();
  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (request.state.status === 'pending') return;
    const input = fields.validate();
    if (input === null) return;

    const result = await request.run(input);
    if (result.status === 'success') completeLogin(result.data);
    if (result.status === 'error') fields.applyFailure(result.failure);
    if (result.status === 'error' && result.failure?.error.code === 'EMAIL_UNCONFIRMED') {
      navigate('/confirmacao-pendente', { state: { email: input.email, reason: 'login' } });
    }
  }, [completeLogin, fields, navigate, request]);
  const errorMessage = request.state.status === 'error' && request.state.failure?.error.field == null
    ? getAuthErrorMessage('login', request.state.failure)
    : null;

  return { fields, state: request.state, submit, errorMessage };
}
