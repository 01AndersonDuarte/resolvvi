type ProgressRailProps = { currentStep: 1 | 2 | 3 };

const STEPS = ['Acesso', 'Consulta', 'Processo'];

export function ProgressRail({ currentStep }: ProgressRailProps) {
  return (
    <nav aria-label="Etapas da consulta" className="mx-auto w-full max-w-3xl">
      <ol className="relative grid grid-cols-3">
        <RailLine currentStep={currentStep} />
        {STEPS.map((step, index) => <ProgressStep key={step} label={step} index={index + 1} currentStep={currentStep} />)}
      </ol>
    </nav>
  );
}

function RailLine({ currentStep }: ProgressRailProps) {
  const fill = currentStep === 1 ? 'w-0' : currentStep === 2 ? 'w-1/2' : 'w-full';

  return (
    <span aria-hidden="true" className="absolute left-[16.66%] right-[16.66%] top-4 h-0.5 bg-line">
      <span className={`block h-full bg-route transition-[width] duration-300 ${fill}`} />
    </span>
  );
}

function ProgressStep(props: { label: string; index: number; currentStep: number }) {
  const active = props.index === props.currentStep;
  const complete = props.index < props.currentStep;

  return (
    <li className="relative z-10 grid justify-items-center gap-2 text-center">
      <span aria-current={active ? 'step' : undefined} className={`grid size-8 place-items-center rounded-full border-2 text-xs font-bold ${getStepClasses(active, complete)}`}>
        {props.index}
      </span>
      <span className={`text-xs font-semibold sm:text-sm ${active ? 'text-ink' : 'text-muted-ink'}`}>{props.label}</span>
    </li>
  );
}

function getStepClasses(active: boolean, complete: boolean): string {
  if (active) return 'border-route bg-route text-white';
  if (complete) return 'border-route bg-white text-route';
  return 'border-line bg-surface text-muted-ink';
}
