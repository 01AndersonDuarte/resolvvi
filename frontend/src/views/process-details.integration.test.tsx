import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../contexts/auth-context';
import { INITIAL_SESSION_STATE } from '../contexts/session-state';
import type { AuthContextValue } from '../contexts/auth-context';
import { ProcessFoundView } from './ProcessFoundView';
import { ProcessSearchView } from './ProcessSearchView';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

const processDetails = {
  id: 17,
  cnj: '1001399-31.2023.8.26.0070',
  forum: 'Foro integrado real',
  court: '2ª Vara Cível',
  lawsuitValue: '10.000,00',
  numberOfAuthors: 0,
};

afterEach(() => {
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe('process details and movement HTTP integration', () => {
  it('loads a direct destination, recovers history locally, and returns to the saved CNJ draft', async () => {
    let movementAttempts = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/processes/17') return jsonResponse(processDetails);
      if (path === '/api/processes/17/movements?page=1') {
        movementAttempts += 1;
        if (movementAttempts === 1) return errorResponse(503, 'SERVICE_UNAVAILABLE');
        return jsonResponse(movementPage);
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.sessionStorage.setItem('process.activeSession', 'session-one');
    window.sessionStorage.setItem('process.cnj.session-one', '10013993120238260070');

    render(<AuthenticatedRouter />);

    expect(await screen.findByText('Foro integrado real')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir');
    expect(screen.getByText('Foro integrado real')).toBeInTheDocument();
    const user = userEvent.setup();
    screen.getByRole('button', { name: 'Tentar novamente' }).focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByText('Ato recuperado pela API')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    screen.getByRole('link', { name: 'Voltar à consulta' }).focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('textbox', { name: 'Número do processo (CNJ)' })).toHaveValue('10013993120238260070');
  });

  it('clears the previous process movement when the route changes during a pending read', async () => {
    let resolveProcess: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path.endsWith('/17')) return Promise.resolve(jsonResponse(processDetails));
      if (path.endsWith('/17/movements?page=1')) return Promise.resolve(jsonResponse(movementPage));
      if (path.endsWith('/18')) return new Promise<Response>((resolve) => { resolveProcess = resolve; });
      if (path.endsWith('/18/movements?page=1')) return Promise.resolve(jsonResponse({ ...movementPage, processId: 18, items: [{ ...movementPage.items[0], id: 2, movementTitle: 'Ato do processo seguinte' }] }));
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const view = render(<AuthenticatedRouter initialPath="/processos/17" />);
    expect(await screen.findByText('Ato recuperado pela API')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir processo seguinte' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Carregando dados do processo'));
    expect(screen.queryByText('Ato recuperado pela API')).not.toBeInTheDocument();
    await actResolve(view, resolveProcess);
    expect(await screen.findByText('Ato do processo seguinte')).toBeInTheDocument();
    expect(screen.queryByText('Ato recuperado pela API')).not.toBeInTheDocument();
  });
});

function AuthenticatedRouter({ initialPath = '/processos/17' }: { initialPath?: string }) {
  const context: AuthContextValue = {
    state: { ...INITIAL_SESSION_STATE, status: 'authenticated', generation: 1, session: {
      sessionId: 'session-one', expiresAt: '2030-01-01T01:00:00Z', serverTime: '2030-01-01T00:00:00Z', receivedAt: 1,
    } },
    refresh: vi.fn(), completeLogin: vi.fn(), logout: vi.fn(async () => true), invalidate: vi.fn(),
  };

  return <AuthContext.Provider value={context}><MemoryRouter initialEntries={[initialPath]}><>
    <Routes>
      <Route path="/consulta" element={<ProcessSearchView />} />
      <Route path="/processos/:id" element={<ProcessFoundView />} />
    </Routes>
    <RouteSwitcher />
  </></MemoryRouter></AuthContext.Provider>;
}

function RouteSwitcher() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => void navigate('/processos/18')}>Abrir processo seguinte</button>;
}

async function actResolve(view: ReturnType<typeof render>, resolveProcess: ((response: Response) => void) | undefined): Promise<void> {
  if (resolveProcess === undefined) throw new Error('Process request was not started');
  await view.findByRole('status');
  await act(async () => resolveProcess(jsonResponse({ ...processDetails, id: 18, cnj: '1001399-31.2023.8.26.0071', forum: 'Outro foro' })));
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function errorResponse(status: number, code: string): Response {
  return new Response(JSON.stringify({ error: { code, message: 'Falha temporária.', field: null, retryAfterSeconds: null } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const movementPage = {
  processId: 17,
  items: [{ id: 1, movementDate: '05/12/2023', movementTitle: 'Ato recuperado pela API', movementContent: 'Conteúdo completo.' }],
  page: 1,
  pageSize: 20,
  total: 1,
  totalPages: 1,
};
