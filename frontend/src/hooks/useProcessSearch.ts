import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProcessInputError, getProcessSearchError, validateProcessCnj } from '../services/process-feedback';
import { clearProcessInput, readProcessInput, saveProcessInput } from '../services/process-input';
import { searchProcess } from '../services/process-service';
import type { ProcessSummary } from '../types/process-summary';
import { useSession } from './useSession';
import { useRequest, type RequestState } from './useRequest';

export function useProcessSearch() {
  const { state: session, invalidate } = useSession();
  const sessionId = session.session?.sessionId ?? '';
  const request = useRequest(searchProcess, { generation: session.generation, invalidateSession: invalidate });
  const [cnj, setCnj] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => restoreDraft(sessionId, setCnj), [sessionId]);
  useEffect(() => {
    if (session.status !== 'authenticated' && session.status !== 'checking') clearDraft();
  }, [session.status]);

  const updateCnj = (value: string): void => {
    request.cancel();
    setCnj(value);
    setFieldError(null);
    if (sessionId !== '') saveProcessInput(sessionId, value);
  };
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => submitProcessSearch({
    event, cnj, run: request.run, setFieldError, navigate,
  });

  return { cnj, updateCnj, fieldError, state: request.state, submit, errorMessage: getSearchMessage(request.state) };
}

function restoreDraft(sessionId: string, setCnj: (cnj: string) => void): void {
  if (sessionId !== '') setCnj(readProcessInput(sessionId));
}

function clearDraft(): void {
  clearProcessInput();
}

type SearchSubmission = {
  event: FormEvent<HTMLFormElement>;
  cnj: string;
  run: (cnj: string) => Promise<
    | { status: 'success'; data: ProcessSummary }
    | { status: 'error'; failure: import('../types/api').RequestFailure | null }
    | { status: 'stale' }
  >;
  setFieldError: (message: string | null) => void;
  navigate: (path: string) => void;
};

async function submitProcessSearch(input: SearchSubmission): Promise<void> {
  input.event.preventDefault();
  const validation = validateProcessCnj(input.cnj);
  if (validation !== null) return input.setFieldError(validation);

  input.setFieldError(null);
  const result = await input.run(input.cnj);
  if (result.status === 'success') input.navigate(`/processos/${result.data.id}`);
  if (result.status === 'error') input.setFieldError(getProcessInputError(result.failure));
}

function getSearchMessage(state: RequestState<ProcessSummary>): string | null {
  if (state.status !== 'error') return null;
  if (getProcessInputError(state.failure) !== null) return null;
  return getProcessSearchError(state.failure, state.error);
}
