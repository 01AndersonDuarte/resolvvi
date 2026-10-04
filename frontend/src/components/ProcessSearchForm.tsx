import type { FormEvent } from 'react';
import { useEffect, useRef } from 'react';
import { FormMessage } from './FormMessage';
import { PrimaryButton } from './PrimaryButton';

type ProcessSearchFormProps = {
  cnj: string;
  disabled: boolean;
  fieldError: string | null;
  message: string | null;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ProcessSearchForm(props: ProcessSearchFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  return <form onSubmit={props.onSubmit} noValidate className="grid w-full gap-5 text-left">
    <label htmlFor="cnj" className="grid gap-2 text-sm font-semibold">Número do processo (CNJ)
      <input ref={inputRef} id="cnj" name="cnj" type="text" inputMode="numeric" autoComplete="off" value={props.cnj} onChange={(event) => props.onChange(event.currentTarget.value)} disabled={props.disabled} aria-invalid={props.fieldError !== null} aria-describedby="cnj-help cnj-error" className="min-h-12 w-full rounded-lg border border-line bg-white px-4 text-base font-normal text-ink outline-none focus:border-route focus:ring-4 focus:ring-route/20 disabled:cursor-wait disabled:bg-muted" />
    </label>
    <p id="cnj-help" className="-mt-3 text-sm leading-6 text-muted-ink">Digite os 20 números do processo, com ou sem pontos e traço.</p>
    <p id="cnj-error" role={props.fieldError ? 'alert' : undefined} aria-live={props.fieldError ? 'assertive' : undefined} className={props.fieldError ? '-mt-3 text-sm font-medium text-danger-ink' : 'sr-only'}>{props.fieldError ?? ''}</p>
    {props.message ? <FormMessage message={props.message} tone="error" /> : null}
    <PrimaryButton type="submit" busy={props.disabled} fullWidth>{props.disabled ? 'Consultando…' : 'Consultar'}</PrimaryButton>
  </form>;
}
