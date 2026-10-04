import type { FormEvent, Ref } from 'react';
import type { CredentialErrors } from '../services/auth-validation';
import { FormField } from './FormField';
import { PrimaryButton } from './PrimaryButton';

type CredentialsFormProps = {
  mode: 'login' | 'registration';
  email: string;
  password: string;
  errors: CredentialErrors;
  emailRef: Ref<HTMLInputElement>;
  passwordRef: Ref<HTMLInputElement>;
  busy: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CredentialsForm(props: CredentialsFormProps) {
  const isRegistration = props.mode === 'registration';
  const label = isRegistration ? 'Criar conta' : 'Entrar';

  return (
    <form noValidate className="grid gap-5 text-left" onSubmit={props.onSubmit} aria-busy={props.busy}>
      <CredentialInputs form={props} />
      <PrimaryButton type="submit" busy={props.busy} fullWidth>{props.busy ? getBusyLabel(props.mode) : label}</PrimaryButton>
    </form>
  );
}

function CredentialInputs({ form }: { form: CredentialsFormProps }) {
  const registration = form.mode === 'registration';

  return <>
    <FormField id="email" label="E-mail" type="email" value={form.email} autoComplete="email" onChange={form.onEmailChange} error={form.errors.email} disabled={form.busy} inputRef={form.emailRef} required />
    <FormField id="password" label="Senha" type="password" value={form.password} autoComplete={registration ? 'new-password' : 'current-password'} onChange={form.onPasswordChange} helpText={registration ? 'Use de 8 a 128 caracteres.' : undefined} error={form.errors.password} disabled={form.busy} inputRef={form.passwordRef} required />
  </>;
}

function getBusyLabel(mode: CredentialsFormProps['mode']): string {
  return mode === 'registration' ? 'Criando conta…' : 'Entrando…';
}
