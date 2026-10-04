import { AuthLinks } from '../components/AuthLinks';
import { CredentialsForm } from '../components/CredentialsForm';
import { AccessPanel, DispatchLayout } from '../components/DispatchLayout';
import { RequestFeedback } from '../components/RequestFeedback';
import { useRegistration } from '../hooks/useRegistration';

export function SignUpView() {
  const flow = useRegistration();
  const busy = flow.state.status === 'pending';

  return (
    <DispatchLayout currentStep={1}>
      <AccessPanel title="Crie sua conta" description="Informe um e-mail e escolha uma senha para acessar a consulta.">
        <CredentialsForm mode="registration" email={flow.fields.email} password={flow.fields.password} errors={flow.fields.errors} emailRef={flow.fields.emailRef} passwordRef={flow.fields.passwordRef} busy={busy} onEmailChange={flow.fields.setEmail} onPasswordChange={flow.fields.setPassword} onSubmit={flow.submit} />
        <RequestFeedback pendingMessage={busy ? 'Criando conta…' : undefined} errorMessage={flow.errorMessage} />
        <AuthLinks email={flow.fields.email} showLogin />
      </AccessPanel>
    </DispatchLayout>
  );
}
