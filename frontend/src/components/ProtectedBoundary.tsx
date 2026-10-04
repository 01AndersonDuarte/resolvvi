import type { ReactNode } from 'react';

type ProtectedBoundaryProps = { authenticated: boolean; children?: ReactNode };

export function ProtectedBoundary({ authenticated, children }: ProtectedBoundaryProps) {
  return (
    <section aria-label="Área protegida" aria-busy={!authenticated} className="grid min-h-40 place-items-center rounded-2xl border border-line bg-protected px-5 py-7 text-center">
      {authenticated ? children : <BoundaryMessage />}
    </section>
  );
}

function BoundaryMessage() {
  return (
    <div className="grid justify-items-center gap-3">
      <LockIcon />
      <p className="font-semibold text-muted-ink">Acesso em validação</p>
      <p className="max-w-md text-sm leading-6 text-muted-ink">O conteúdo protegido só aparece depois que confirmarmos sua sessão.</p>
    </div>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7 fill-none stroke-current text-muted-ink" strokeWidth="1.8">
      <rect x="4.5" y="10" width="15" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15" r="1" />
    </svg>
  );
}
