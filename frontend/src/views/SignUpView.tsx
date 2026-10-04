import { AuthLinks } from '../components/AuthLinks';
import { CredentialsForm } from '../components/CredentialsForm';
import { AccessPanel, DispatchLayout } from '../components/DispatchLayout';
import { RequestFeedback } from '../components/RequestFeedback';
import { useRegistration } from '../hooks/useRegistration';

const RECOVERY_CODES = new Set([
  'CONFIRMATION_SEND_FAILED', 'CONFIRMATION_SEND_UNKNOWN', 'VERIFICATION_RATE_LIMITED', 'REQUEST_TIMEOUT',
]);

export function SignUpView() {
  const flow = useRegistration();
  const busy = flow.state.status === 'pending';
  const code = flow.state.status === 'error' ? flow.state.failure?.error.code : undefined;
  const showRecovery = flow.state.status === 'error' && (code === undefined || RECOVERY_CODES.has(code));

  return (
    <DispatchLayout currentStep={1}>
      <AccessPanel title="Crie sua conta" description="Informe somente seu e-mail e uma senha. Você confirmará o endereço antes de entrar.">
        <CredentialsForm mode="registration" email={flow.fields.email} password={flow.fields.password} errors={flow.fields.errors} emailRef={flow.fields.emailRef} passwordRef={flow.fields.passwordRef} busy={busy} onEmailChange={flow.fields.setEmail} onPasswordChange={flow.fields.setPassword} onSubmit={flow.submit} />
        <RequestFeedback pendingMessage={busy ? 'Criando conta…' : undefined} errorMessage={flow.errorMessage} />
        {flow.remainingSeconds > 0 ? <RequestFeedback infoMessage={`Tente novamente em ${flow.remainingSeconds} segundos.`} /> : null}
        {showRecovery ? <AuthLinks email={flow.fields.email} showLogin showResend /> : <AuthLinks showLogin />}
      </AccessPanel>
    </DispatchLayout>
  );
}
