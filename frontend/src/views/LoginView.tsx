import { useLocation } from 'react-router-dom';
import { AuthLinks } from '../components/AuthLinks';
import { CredentialsForm } from '../components/CredentialsForm';
import { AccessPanel, DispatchLayout } from '../components/DispatchLayout';
import { RequestFeedback } from '../components/RequestFeedback';
import { useLogin } from '../hooks/useLogin';
import { useSession } from '../hooks/useSession';
import { readAuthNavigationState } from '../services/auth-navigation';

export function LoginView() {
  const location = useLocation();
  const initialEmail = readAuthNavigationState(location.state).email;
  const flow = useLogin(initialEmail);
  const { state: session } = useSession();
  const busy = flow.state.status === 'pending';

  return (
    <DispatchLayout currentStep={1}>
      <AccessPanel title="Entre para continuar" description="Use a conta com e-mail confirmado para acessar a consulta.">
        <CredentialsForm mode="login" email={flow.fields.email} password={flow.fields.password} errors={flow.fields.errors} emailRef={flow.fields.emailRef} passwordRef={flow.fields.passwordRef} busy={busy} onEmailChange={flow.fields.setEmail} onPasswordChange={flow.fields.setPassword} onSubmit={flow.submit} />
        <RequestFeedback pendingMessage={busy ? 'Entrando…' : undefined} errorMessage={flow.errorMessage} infoMessage={session.status === 'anonymous' ? session.message : null} />
        <AuthLinks email={flow.fields.email} showRegistration showResend />
      </AccessPanel>
    </DispatchLayout>
  );
}
