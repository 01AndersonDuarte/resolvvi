import type { ReactNode } from 'react';
import { PageTitle } from './PageTitle';
import { ProgressRail } from './ProgressRail';

type DispatchLayoutProps = { children: ReactNode; currentStep: 1 | 2 | 3 };

export function DispatchLayout({ children, currentStep }: DispatchLayoutProps) {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <DispatchHeader />
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-8 sm:py-12">
        <ProgressRail currentStep={currentStep} />
        {children}
      </div>
    </main>
  );
}

function DispatchHeader() {
  return (
    <header className="border-b border-white/10 bg-graphite text-white">
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between px-4 sm:px-8">
        <p className="text-sm font-semibold tracking-wide">Consulta de processos</p>
      </div>
    </header>
  );
}

export function AccessPanel(props: { title: string; description: string; children?: ReactNode }) {
  return (
    <section aria-labelledby="page-title" className="mx-auto grid w-full max-w-4xl justify-items-center gap-8 rounded-2xl border border-line bg-white p-5 text-center shadow-panel sm:p-8 lg:p-10">
      <PageTitle>{props.title}</PageTitle>
      {props.description ? <p className="max-w-2xl text-base leading-7 text-muted-ink">{props.description}</p> : null}
      {props.children ? <div className="grid w-full max-w-xl gap-6">{props.children}</div> : null}
    </section>
  );
}
