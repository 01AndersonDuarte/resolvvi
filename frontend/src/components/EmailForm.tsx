import type { FormEvent, Ref } from 'react';
import { FormField } from './FormField';
import { PrimaryButton } from './PrimaryButton';

type EmailFormProps = {
  email: string;
  error: string | null;
  inputRef: Ref<HTMLInputElement>;
  busy: boolean;
  disabled: boolean;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function EmailForm(props: EmailFormProps) {
  return (
    <form noValidate className="grid gap-5 text-left" onSubmit={props.onSubmit} aria-busy={props.busy}>
      <FormField id="email" label="E-mail" type="email" value={props.email} autoComplete="email" onChange={props.onEmailChange} error={props.error} disabled={props.busy || props.disabled} inputRef={props.inputRef} required />
      <PrimaryButton type="submit" busy={props.busy} disabled={props.disabled} fullWidth>
        {props.busy ? 'Solicitando confirmação…' : 'Reenviar confirmação'}
      </PrimaryButton>
    </form>
  );
}
