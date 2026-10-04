import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../services/http-client';
import type { AuthContextValue } from '../contexts/auth-context';
import { INITIAL_SESSION_STATE } from '../contexts/session-state';
import { AuthContext } from '../contexts/auth-context';
import type { ProcessSummary } from '../types/process-summary';
import { ProcessFoundView } from './ProcessFoundView';
import { ProcessSearchView } from './ProcessSearchView';

const processSummary: ProcessSummary = { id: 17, cnj: '1001399-31.2023.8.26.0070' };
const api = vi.hoisted(() => ({ searchProcess: vi.fn(), getProcessById: vi.fn() }));

vi.mock('../services/process-service', () => api);

beforeEach(() => {
  window.sessionStorage.clear();
  api.searchProcess.mockReset();
  api.getProcessById.mockReset().mockResolvedValue(processSummary);
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
    expect(await screen.findByRole('heading', { name: 'Processo encontrado' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Processo encontrado' })).toHaveFocus();
    expect(screen.getByText(processSummary.cnj)).toBeInTheDocument();
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
    expect(await screen.findByRole('heading', { name: 'Processo encontrado' })).toBeInTheDocument();
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
    expect(await screen.findByRole('heading', { name: 'Processo encontrado' })).toBeInTheDocument();
  });

  it('loads a direct destination and gives a return action when the process is missing', async () => {
    api.getProcessById.mockRejectedValue(notFoundError());
    renderFound();

    expect(await screen.findByText('Não encontramos esse processo na base disponível.')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('link', { name: 'Voltar à consulta' }));
    expect(await screen.findByRole('textbox', { name: 'Número do processo (CNJ)' })).toBeInTheDocument();
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
    expect(screen.queryByRole('heading', { name: 'Processo encontrado' })).not.toBeInTheDocument();
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

function Provider({ children, generation = 1 }: { children: React.ReactNode; generation?: number }) {
  const value: AuthContextValue = {
    state: { ...INITIAL_SESSION_STATE, status: 'authenticated', generation, session: {
      sessionId: 'session-one', expiresAt: '2030-01-01T01:00:00Z', serverTime: '2030-01-01T00:00:00Z', receivedAt: 1,
    } },
    refresh: vi.fn(), completeLogin: vi.fn(), logout: vi.fn().mockResolvedValue(true), invalidate: vi.fn(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function notFoundError(): ApiRequestError {
  return new ApiRequestError('missing', 404, {
    code: 'PROCESS_NOT_FOUND', message: 'internal', field: null, retryAfterSeconds: null,
  });
}
