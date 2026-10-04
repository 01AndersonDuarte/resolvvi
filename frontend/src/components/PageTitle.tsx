import { useEffect, useRef } from 'react';

type PageTitleProps = { children: string; description?: string };

export function PageTitle({ children, description }: PageTitleProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => titleRef.current?.focus(), []);

  return (
    <header className="grid gap-3">
      <h1 ref={titleRef} tabIndex={-1} id="page-title" className="max-w-3xl text-3xl font-semibold tracking-[-0.025em] text-ink outline-none sm:text-4xl">{children}</h1>
      {description ? <p className="max-w-2xl text-base leading-7 text-muted-ink">{description}</p> : null}
    </header>
  );
}
