import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type TextLinkProps = {
  children: ReactNode;
  to: string;
  state?: unknown;
};

export function TextLink({ children, to, state }: TextLinkProps) {
  return (
    <Link
      to={to}
      state={state}
      className="font-semibold text-route underline decoration-route/35 underline-offset-4 transition hover:text-route-strong focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-route/25"
    >
      {children}
    </Link>
  );
}
