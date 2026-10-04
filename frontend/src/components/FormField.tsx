import type { ChangeEvent, ReactNode, Ref } from 'react';

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
  inputRef?: Ref<HTMLInputElement>;
  required?: boolean;
};

export function FormField({
  id, label, value, type, autoComplete, onChange, helpText, error, disabled, inputRef, required,
}: FormFieldProps) {
  const descriptionId = error ? `${id}-error` : helpText ? `${id}-help` : undefined;

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
      <input
        id={id}
        ref={inputRef}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionId}
        disabled={disabled ?? false}
        required={required ?? false}
        className="min-h-12 rounded-lg border border-line bg-white px-4 text-base text-ink outline-none transition focus-visible:border-route focus-visible:ring-4 focus-visible:ring-route/20 disabled:bg-muted disabled:text-muted-ink"
      />
      <FieldHint id={descriptionId} error={error} helpText={helpText} />
    </div>
  );
}

function FieldHint(props: { id?: string; error?: string | null; helpText?: string }): ReactNode {
  if (!props.id) return null;

  return <p id={props.id} className={props.error ? 'text-sm text-danger' : 'text-sm text-muted-ink'}>{props.error ?? props.helpText}</p>;
}
