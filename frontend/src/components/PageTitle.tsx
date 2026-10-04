type PageTitleProps = { children: string; description?: string };

export function PageTitle({ children, description }: PageTitleProps) {
  return (
    <header className="grid gap-3">
      <h1 id="page-title" className="max-w-3xl text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">{children}</h1>
      {description ? <p className="max-w-2xl text-base leading-7 text-muted-ink">{description}</p> : null}
    </header>
  );
}
