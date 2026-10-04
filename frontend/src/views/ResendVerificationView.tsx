import { useLocation } from 'react-router-dom';
import { AuthLinks } from '../components/AuthLinks';
import { AccessPanel, DispatchLayout } from '../components/DispatchLayout';
import { EmailForm } from '../components/EmailForm';
import { FormMessage } from '../components/FormMessage';
import { RequestFeedback } from '../components/RequestFeedback';
import { useResendVerification } from '../hooks/useVerification';
import { readAuthNavigationState } from '../services/auth-navigation';

export function ResendVerificationView() {
  const location = useLocation();
  const initialEmail = readAuthNavigationState(location.state).email;
  const flow = useResendVerification(initialEmail);
  const busy = flow.state.status === 'pending';
  const success = flow.state.status === 'success' ? flow.state.data.message : null;

  return (
    <DispatchLayout currentStep={1}>
      <AccessPanel title="Reenvie a confirmação" description="Informe o e-mail da conta. A resposta não revela se há uma confirmação pendente.">
        <EmailForm email={flow.field.email} error={flow.field.error} inputRef={flow.field.inputRef} busy={busy} disabled={flow.remainingSeconds > 0} onEmailChange={flow.field.setEmail} onSubmit={flow.submit} />
        <RequestFeedback pendingMessage={busy ? 'Solicitando confirmação…' : undefined} errorMessage={flow.errorMessage} successMessage={success} />
        {flow.remainingSeconds > 0 ? <FormMessage message={`Tente novamente em ${flow.remainingSeconds} segundos.`} tone="info" /> : null}
        <AuthLinks email={flow.field.email} showLogin />
      </AccessPanel>
    </DispatchLayout>
  );
}
