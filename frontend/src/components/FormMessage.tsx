type FormMessageProps = {
  message: string;
  tone: 'info' | 'error' | 'success';
};

const TONE_CLASSES = {
  info: 'border-line bg-muted text-ink',
  error: 'border-danger/40 bg-danger-soft text-danger-ink',
  success: 'border-success/40 bg-success-soft text-success-ink',
};

export function FormMessage({ message, tone }: FormMessageProps) {
  const role = tone === 'error' ? 'alert' : 'status';

  return (
    <div role={role} aria-live={tone === 'error' ? 'assertive' : 'polite'} className={`rounded-lg border px-4 py-3 text-sm ${TONE_CLASSES[tone]}`}>
      {message}
    </div>
  );
}
