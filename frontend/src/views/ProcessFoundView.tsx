import { Link, useParams } from 'react-router-dom';
import { DispatchLayout } from '../components/DispatchLayout';
import { LogoutButton } from '../components/LogoutButton';
import { ProcessDetailsContent } from '../components/ProcessDetailsContent';
import { ProcessDetailsState } from '../components/ProcessDetailsState';
import { useProcessDetails } from '../hooks/useProcessDetails';
import { useSession } from '../hooks/useSession';

export function ProcessFoundView() {
  const { id } = useParams();
  const { state: session } = useSession();

  if (session.status !== 'authenticated') {
    return <DispatchLayout currentStep={3} action={<LogoutButton />}>{null}</DispatchLayout>;
  }

  return <ProcessDetailsPage key={`${id ?? ''}:${session.generation}`} id={id} />;
}

function ProcessDetailsPage({ id }: { id: string | undefined }) {
  const process = useProcessDetails(id);
  const invalidAddress = id === undefined;

  return <DispatchLayout currentStep={3} action={<LogoutButton />}>
    <div className="mx-auto grid w-full max-w-4xl gap-5">
      <ProcessDetailsState state={process.state} errorMessage={process.errorMessage} onRetry={() => void process.retry()} invalidAddress={invalidAddress} />
      {process.state.status === 'success' ? <ProcessDetailsContent process={process.state.data} /> : null}
      <Link to="/consulta" className="min-h-12 justify-self-start rounded-lg border border-route px-5 py-3 text-center font-semibold text-route hover:bg-route/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-route/30">Voltar à consulta</Link>
    </div>
  </DispatchLayout>;
}
