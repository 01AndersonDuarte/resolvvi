import type { ChangeEvent, ReactNode } from 'react';

type FormFieldProps = {
  id: string;
  label: string;
  value: string;
  type: 'email' | 'password' | 'text';
  autoComplete: string;
  onChange: (value: string) => void;
  helpText?: string;
  error?: string | null;
  disabled?: boolean;
};

export function FormField(props: FormFieldProps) {
  const descriptionId = props.error ? `${props.id}-error` : props.helpText ? `${props.id}-help` : undefined;

  return (
    <div className="grid gap-2">
      <label htmlFor={props.id} className="text-sm font-semibold text-ink">{props.label}</label>
      <input
        id={props.id}
        name={props.id}
        type={props.type}
        value={props.value}
        autoComplete={props.autoComplete}
        onChange={(event: ChangeEvent<HTMLInputElement>) => props.onChange(event.currentTarget.value)}
        aria-invalid={Boolean(props.error)}
        aria-describedby={descriptionId}
        disabled={props.disabled ?? false}
        className="min-h-12 rounded-lg border border-line bg-white px-4 text-base text-ink outline-none transition focus-visible:border-route focus-visible:ring-4 focus-visible:ring-route/20 disabled:bg-muted disabled:text-muted-ink"
      />
      <FieldHint id={descriptionId} error={props.error} helpText={props.helpText} />
    </div>
  );
}

function FieldHint(props: { id?: string; error?: string | null; helpText?: string }): ReactNode {
  if (!props.id) return null;

  return <p id={props.id} className={props.error ? 'text-sm text-danger' : 'text-sm text-muted-ink'}>{props.error ?? props.helpText}</p>;
}
