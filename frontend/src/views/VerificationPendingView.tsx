import { useLocation } from 'react-router-dom';
import { AuthLinks } from '../components/AuthLinks';
import { AccessPanel, DispatchLayout } from '../components/DispatchLayout';
import { FormMessage } from '../components/FormMessage';
import { readAuthNavigationState } from '../services/auth-navigation';

const REGISTRATION_MESSAGE = 'Confira seu e-mail para continuar. Se já possui conta confirmada, entre.';
const LOGIN_MESSAGE = 'Confirme seu e-mail para entrar.';

export function VerificationPendingView() {
  const location = useLocation();
  const state = readAuthNavigationState(location.state);
  const message = state.reason === 'login' ? LOGIN_MESSAGE : REGISTRATION_MESSAGE;

  return (
    <DispatchLayout currentStep={1}>
      <AccessPanel title="Confirme seu e-mail" description="A confirmação protege o acesso antes da primeira entrada.">
        <FormMessage message={message} tone="info" />
        <p className="text-base leading-7 text-muted-ink">Confira sua caixa de entrada e a pasta de spam. O link abre esta aplicação para você concluir a confirmação.</p>
        {state.email ? <p className="break-all text-sm font-semibold text-ink">Endereço informado: {state.email}</p> : null}
        <AuthLinks email={state.email} showLogin showResend />
      </AccessPanel>
    </DispatchLayout>
  );
}
