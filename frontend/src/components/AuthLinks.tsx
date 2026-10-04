import { TextLink } from './TextLink';

type AuthLinksProps = {
  email?: string;
  showLogin?: boolean;
  showRegistration?: boolean;
  showResend?: boolean;
};

export function AuthLinks(props: AuthLinksProps) {
  const state = props.email ? { email: props.email } : undefined;

  return (
    <nav aria-label="Ações da conta" className="flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm">
      {props.showLogin ? <TextLink to="/entrar" state={state}>Entrar</TextLink> : null}
      {props.showRegistration ? <TextLink to="/criar-conta">Criar conta</TextLink> : null}
      {props.showResend ? <TextLink to="/reenviar-confirmacao" state={state}>Reenviar confirmação</TextLink> : null}
    </nav>
  );
}
