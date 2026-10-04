import { AccessPanel, DispatchLayout } from '../components/DispatchLayout';
import { LogoutButton } from '../components/LogoutButton';
import { ProcessSearchForm } from '../components/ProcessSearchForm';
import { useProcessSearch } from '../hooks/useProcessSearch';

export function ProcessSearchView() {
  const search = useProcessSearch();
  const pending = search.state.status === 'pending';

  return <DispatchLayout currentStep={2} action={<LogoutButton />}>
    <AccessPanel title="Consultar processo" description="Localize um processo na base disponível pelo número CNJ.">
      <ProcessSearchForm cnj={search.cnj} disabled={pending} fieldError={search.fieldError} message={search.errorMessage} onChange={search.updateCnj} onSubmit={(event) => void search.submit(event)} />
    </AccessPanel>
  </DispatchLayout>;
}
