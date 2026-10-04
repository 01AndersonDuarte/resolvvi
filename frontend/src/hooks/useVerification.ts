import type { FormEvent } from 'react';
import { useCallback } from 'react';
import { getAuthErrorMessage, getRetryAfterSeconds } from '../services/auth-feedback';
import { confirmEmail, resendVerification } from '../services/auth-service';
import { useEmailField } from './useAuthFields';
import { useAuthRequest } from './useAuthRequest';
import { useRetryCountdown } from './useRetryCountdown';

export function useEmailVerification() {
  return useAuthRequest(confirmEmail);
}

export function useResendVerification(initialEmail = '') {
  const field = useEmailField(initialEmail);
  const request = useAuthRequest(resendVerification);
  const retrySeconds = request.state.status === 'success'
    ? 60
    : request.state.status === 'error' ? getFailureRetrySeconds(request.state.failure) : null;
  const countdownKey = request.state.status === 'success'
    ? request.state.data
    : request.state.status === 'error' ? request.state.failure : null;
  const remainingSeconds = useRetryCountdown(retrySeconds, countdownKey);
  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (request.state.status === 'pending' || remainingSeconds > 0) return;
    const email = field.validate();
    if (email === null) return;

    const result = await request.run({ email });
    if (result.status === 'error') field.applyFailure(result.failure);
  }, [field, remainingSeconds, request]);
  const errorMessage = request.state.status === 'error' && request.state.failure?.error.field == null
    ? getAuthErrorMessage('resend', request.state.failure)
    : null;

  return { field, state: request.state, submit, remainingSeconds, errorMessage };
}

function getFailureRetrySeconds(failure: Parameters<typeof getRetryAfterSeconds>[0]): number | null {
  const retryAfterSeconds = getRetryAfterSeconds(failure);
  if (retryAfterSeconds !== null) return retryAfterSeconds;

  if (failure === null || failure.error.code === 'CONFIRMATION_SEND_FAILED' ||
    failure.error.code === 'CONFIRMATION_SEND_UNKNOWN' || failure.error.code === 'SERVICE_UNAVAILABLE') {
    return 60;
  }

  return null;
}
