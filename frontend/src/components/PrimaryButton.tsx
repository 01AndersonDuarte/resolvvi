import type { ReactNode } from 'react';

type PrimaryButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  busy?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
  fullWidth?: boolean;
};

export function PrimaryButton({ children, disabled = false, busy = false, type = 'button', onClick, fullWidth = false }: PrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy}
      onClick={onClick}
      className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-route px-5 font-semibold text-white transition hover:bg-route-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-route/30 disabled:cursor-wait disabled:bg-muted-ink ${fullWidth ? 'w-full' : ''}`}
    >
      {children}
    </button>
  );
}
