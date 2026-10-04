import type { FormEvent } from 'react';
import { AuthLinks } from '../components/AuthLinks';
import { AccessPanel, DispatchLayout } from '../components/DispatchLayout';
import { PrimaryButton } from '../components/PrimaryButton';
import { RequestFeedback } from '../components/RequestFeedback';
import { useEmailVerification } from '../hooks/useVerification';
import { getAuthErrorMessage } from '../services/auth-feedback';

const INVALID_LINK_MESSAGE = 'Este link não é mais válido. Solicite outra confirmação ou entre se já confirmou seu e-mail.';

export function EmailVerificationView({ token }: { token: string | null }) {
  const request = useEmailVerification();
  const busy = request.state.status === 'pending';
  const invalid = token === null || request.state.status === 'error' && request.state.failure?.error.code === 'VERIFICATION_INVALID';
  const errorMessage = getVerificationError(token, request.state);
  const successMessage = request.state.status === 'success' ? request.state.data.message : null;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (token !== null && !busy) void request.run(token);
  };

  return (
    <DispatchLayout currentStep={1}>
      <AccessPanel title="Confirme seu e-mail" description="Use a ação abaixo para concluir. A confirmação não inicia uma sessão.">
        {!invalid && successMessage === null ? <form onSubmit={submit}><PrimaryButton type="submit" busy={busy} fullWidth>{busy ? 'Confirmando e-mail…' : 'Confirmar e-mail'}</PrimaryButton></form> : null}
        <RequestFeedback pendingMessage={busy ? 'Confirmando e-mail…' : undefined} errorMessage={errorMessage} successMessage={successMessage} />
        <AuthLinks showLogin showResend />
      </AccessPanel>
    </DispatchLayout>
  );
}

function getVerificationError(
  token: string | null,
  state: ReturnType<typeof useEmailVerification>['state'],
): string | null {
  if (token === null) return INVALID_LINK_MESSAGE;
  if (state.status !== 'error') return null;

  return getAuthErrorMessage('confirmation', state.failure);
}
