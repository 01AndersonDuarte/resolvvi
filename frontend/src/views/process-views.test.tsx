import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../services/http-client';
import type { AuthContextValue } from '../contexts/auth-context';
import { INITIAL_SESSION_STATE } from '../contexts/session-state';
import { AuthContext } from '../contexts/auth-context';
import type { ProcessDetails } from '../types/process-details';
import type { ProcessSummary } from '../types/process-summary';
import { ProcessFoundView } from './ProcessFoundView';
import { ProcessSearchView } from './ProcessSearchView';

const processSummary: ProcessSummary = { id: 17, cnj: '1001399-31.2023.8.26.0070' };
const processDetails: ProcessDetails = {
  ...processSummary,
  forum: 'Foro de Batatais',
  court: '2ª Vara Cível',
  lawsuitValue: '10.000,00',
  numberOfAuthors: 0,
};
const api = vi.hoisted(() => ({ searchProcess: vi.fn(), getProcessById: vi.fn(), getProcessMovements: vi.fn() }));

vi.mock('../services/process-service', () => api);

beforeEach(() => {
  window.sessionStorage.clear();
  api.searchProcess.mockReset();
  api.getProcessById.mockReset().mockResolvedValue(processDetails);
  api.getProcessMovements.mockReset().mockResolvedValue({ processId: 17, items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
});

describe('protected process journey', () => {
  it('focuses the CNJ field and distinguishes empty input from malformed input', async () => {
    const user = userEvent.setup();
    renderSearch();
    const input = screen.getByRole('textbox', { name: 'Número do processo (CNJ)' });

    expect(input).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe o número do processo.');
    await user.type(input, '123 invalid');
    await user.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Confira o formato');
    expect(api.searchProcess).not.toHaveBeenCalled();
  });

  it('submits with Enter once, locks the field, navigates to the exact result and restores the draft', async () => {
    const user = userEvent.setup();
    let resolveSearch!: (value: ProcessSummary) => void;
    api.searchProcess.mockImplementation(() => new Promise((resolve) => { resolveSearch = resolve; }));
    renderSearch();
    const input = screen.getByRole('textbox', { name: 'Número do processo (CNJ)' });
    await user.type(input, '10013993120238260070{Enter}');

    expect(await screen.findByRole('button', { name: 'Consultando…' })).toBeDisabled();
    expect(input).toBeDisabled();
    await user.keyboard('{Enter}');
    expect(api.searchProcess).toHaveBeenCalledTimes(1);

    await act(async () => resolveSearch(processSummary));
    expect(await screen.findByRole('heading', { name: 'Processo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Processo' })).toBeInTheDocument();
    expect(screen.getByText(processSummary.cnj)).toBeInTheDocument();
    expect(screen.getByText('Foro de Batatais')).toBeInTheDocument();
    expect(screen.getByText('2ª Vara Cível')).toBeInTheDocument();
    expect(screen.getByText('10.000,00')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Informações da base importada, sem atualização automática junto ao tribunal')).toBeInTheDocument();
    expect(api.getProcessById).toHaveBeenCalledWith('17', expect.any(AbortSignal));
    await user.click(screen.getByRole('link', { name: 'Voltar à consulta' }));
    expect(await screen.findByRole('textbox', { name: 'Número do processo (CNJ)' })).toHaveValue('10013993120238260070');
  });

  it('accepts the complete CNJ mask without rewriting its digits', async () => {
    const user = userEvent.setup();
    api.searchProcess.mockResolvedValue(processSummary);
    renderSearch();
    await user.type(screen.getByRole('textbox', { name: 'Número do processo (CNJ)' }), processSummary.cnj);
    await user.click(screen.getByRole('button', { name: 'Consultar' }));

    expect(api.searchProcess).toHaveBeenCalledWith(processSummary.cnj, expect.any(AbortSignal));
    expect(await screen.findByRole('heading', { name: 'Processo' })).toBeInTheDocument();
  });

  it('keeps the entered CNJ and offers correction when an exact match is absent', async () => {
    const user = userEvent.setup();
    api.searchProcess.mockRejectedValueOnce(notFoundError()).mockResolvedValue(processSummary);
    renderSearch();
    const input = screen.getByRole('textbox', { name: 'Número do processo (CNJ)' });
    await user.type(input, '10022718220258260003');
    await user.click(screen.getByRole('button', { name: 'Consultar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não encontramos esse processo');
    expect(input).toHaveValue('10022718220258260003');
    expect(screen.getByRole('button', { name: 'Consultar' })).toBeEnabled();
    await user.clear(input);
    await user.type(input, '10013993120238260070');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(await screen.findByRole('heading', { name: 'Processo' })).toBeInTheDocument();
  });

  it('loads a direct destination and gives a return action when the process is missing', async () => {
    api.getProcessById.mockRejectedValue(notFoundError());
    renderFound();

    expect(await screen.findByText('Não encontramos esse processo na base disponível.')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('link', { name: 'Voltar à consulta' }));
    expect(await screen.findByRole('textbox', { name: 'Número do processo (CNJ)' })).toBeInTheDocument();
  });

  it('keeps loading distinct from absence and keeps the return action available', async () => {
    api.getProcessById.mockImplementation(() => new Promise(() => undefined));
    renderFound();

    expect(screen.getByRole('status')).toHaveTextContent('Carregando dados do processo');
    expect(screen.queryByText('Não encontramos esse processo na base disponível.')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar à consulta' })).toBeInTheDocument();
  });

  it('labels absent general fields without converting a zero author count to absence', async () => {
    api.getProcessById.mockResolvedValue({
      ...processDetails,
      forum: null,
      court: null,
      lawsuitValue: null,
      numberOfAuthors: null,
    });
    renderFound();

    expect(await screen.findAllByText('Não informado')).toHaveLength(4);
  });

  it('distinguishes an invalid address from a missing process', async () => {
    api.getProcessById.mockRejectedValue(invalidAddressError());
    renderFound();

    expect(await screen.findByText('O endereço do processo é inválido. Confira o endereço e tente novamente.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar à consulta' })).toBeInTheDocument();
  });

  it('retries a recoverable details failure without losing the return action', async () => {
    api.getProcessById.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(processDetails);
    renderFound();

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Foro de Batatais')).toBeInTheDocument();
    expect(api.getProcessById).toHaveBeenCalledTimes(2);
  });

  it('drops details for the previous route while the next process loads', async () => {
    let resolveOldDetails!: (value: ProcessDetails) => void;
    api.getProcessById
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOldDetails = resolve; }))
      .mockImplementation(() => new Promise(() => undefined));
    const view = renderFound();

    view.rerender(<Provider><MemoryRouter initialEntries={['/processos/999']}><>
      <Routes>
      <Route path="/consulta" element={<ProcessSearchView />} />
      <Route path="/processos/:id" element={<ProcessFoundView />} />
      </Routes>
      <PathChanger to="/processos/1000" />
    </></MemoryRouter></Provider>);
    await act(async () => resolveOldDetails(processDetails));

    expect(screen.getByRole('status')).toHaveTextContent('Carregando dados do processo');
    expect(screen.queryByText('Foro de Batatais')).not.toBeInTheDocument();
    expect(api.getProcessById).toHaveBeenLastCalledWith('1000', expect.any(AbortSignal));
  });

  it('removes protected details when the session generation is invalidated', async () => {
    const view = renderFound();
    expect(await screen.findByText('Foro de Batatais')).toBeInTheDocument();

    view.rerender(<Provider generation={2} authenticated={false}><MemoryRouter initialEntries={['/processos/999']}><Routes>
      <Route path="/consulta" element={<ProcessSearchView />} />
      <Route path="/processos/:id" element={<ProcessFoundView />} />
    </Routes></MemoryRouter></Provider>);

    expect(screen.queryByText('Foro de Batatais')).not.toBeInTheDocument();
    expect(screen.queryByText(processSummary.cnj)).not.toBeInTheDocument();
  });

  it('ignores a search response that arrives after the session generation changes', async () => {
    let resolveSearch!: (value: ProcessSummary) => void;
    api.searchProcess.mockImplementation(() => new Promise((resolve) => { resolveSearch = resolve; }));
    const view = renderSearch();
    await userEvent.setup().type(screen.getByRole('textbox', { name: 'Número do processo (CNJ)' }), '10013993120238260070{Enter}');

    view.rerender(<Provider generation={2}><MemoryRouter initialEntries={['/consulta']}><Routes>
      <Route path="/consulta" element={<ProcessSearchView />} />
      <Route path="/processos/:id" element={<ProcessFoundView />} />
    </Routes></MemoryRouter></Provider>);
    await act(async () => resolveSearch(processSummary));

    expect(screen.getByRole('textbox', { name: 'Número do processo (CNJ)' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Processo' })).not.toBeInTheDocument();
    expect(api.getProcessById).not.toHaveBeenCalled();
  });
});

function renderSearch() {
  return render(<Provider><MemoryRouter initialEntries={['/consulta']}><Routes>
    <Route path="/consulta" element={<ProcessSearchView />} />
    <Route path="/processos/:id" element={<ProcessFoundView />} />
  </Routes></MemoryRouter></Provider>);
}

function renderFound() {
  return render(<Provider><MemoryRouter initialEntries={['/processos/999']}><Routes>
    <Route path="/consulta" element={<ProcessSearchView />} />
    <Route path="/processos/:id" element={<ProcessFoundView />} />
  </Routes></MemoryRouter></Provider>);
}

function Provider({ children, generation = 1, authenticated = true }: { children: React.ReactNode; generation?: number; authenticated?: boolean }) {
  const value: AuthContextValue = {
    state: authenticated ? { ...INITIAL_SESSION_STATE, status: 'authenticated', generation, session: {
      sessionId: 'session-one', expiresAt: '2030-01-01T01:00:00Z', serverTime: '2030-01-01T00:00:00Z', receivedAt: 1,
    } } : { ...INITIAL_SESSION_STATE, status: 'anonymous', generation },
    refresh: vi.fn(), completeLogin: vi.fn(), logout: vi.fn().mockResolvedValue(true), invalidate: vi.fn(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function notFoundError(): ApiRequestError {
  return new ApiRequestError('missing', 404, {
    code: 'PROCESS_NOT_FOUND', message: 'internal', field: null, retryAfterSeconds: null,
  });
}

function invalidAddressError(): ApiRequestError {
  return new ApiRequestError('invalid', 400, {
    code: 'INVALID_INPUT', message: 'internal', field: null, retryAfterSeconds: null,
  });
}

function PathChanger({ to }: { to: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate(to);
  }, [navigate, to]);

  return null;
}
