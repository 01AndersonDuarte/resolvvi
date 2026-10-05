import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../contexts/auth-context';
import type { AuthContextValue } from '../contexts/auth-context';
import { INITIAL_SESSION_STATE } from '../contexts/session-state';
import { ProcessFoundView } from './ProcessFoundView';

afterEach(() => vi.unstubAllGlobals());

describe('summary and movement pagination integration', () => {
  it('keeps manual history pagination independent from summary generation', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => respondToRequest(String(input)));
    vi.stubGlobal('fetch', fetchMock);
    render(<Provider><MemoryRouter initialEntries={['/processos/17']}><Routes>
      <Route path="/processos/:id" element={<ProcessFoundView />} />
    </Routes></MemoryRouter></Provider>);

    const user = userEvent.setup();
    await screen.findByText('Ainda não há um resumo para este processo.');
    await user.click(await screen.findByRole('button', { name: 'Próxima' }));

    expect(await screen.findByText('Movimento seguinte')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([path]) => String(path).includes('/generations'))).toHaveLength(0);
    expect(fetchMock.mock.calls.filter(([path]) => String(path).includes('/ai-summary?'))).toHaveLength(1);
  });
});

async function respondToRequest(path: string): Promise<Response> {
  if (path === '/api/processes/17') return jsonResponse(processDetails);
  if (path === '/api/processes/17/ai-summary?track=true') return jsonResponse(summaryState);
  if (path.startsWith('/api/processes/17/movements?')) {
    const page = Number(new URL(path, 'http://localhost').searchParams.get('page'));
    return jsonResponse(page === 1 ? firstPage : secondPage);
  }
  throw new Error(`Unexpected request: ${path}`);
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function Provider({ children }: { children: React.ReactNode }) {
  const context: AuthContextValue = {
    state: { ...INITIAL_SESSION_STATE, status: 'authenticated', generation: 1, session: {
      sessionId: 'session-one', expiresAt: '2030-01-01T01:00:00Z', serverTime: '2030-01-01T00:00:00Z', receivedAt: 1,
    } },
    refresh: vi.fn(), completeLogin: vi.fn(), logout: vi.fn(async () => true), invalidate: vi.fn(),
  };
  return <AuthContext.Provider value={context}>{children}</AuthContext.Provider>;
}

const processDetails = {
  id: 17, cnj: '1001399-31.2023.8.26.0070', forum: 'Foro de Batatais', court: '2ª Vara Cível',
  lawsuitValue: '10.000,00', numberOfAuthors: 0,
};
const movement = { id: 1, movementDate: '05/12/2023', movementTitle: 'Movimento inicial', movementContent: 'Conteúdo inicial' };
const firstItems = Array.from({ length: 20 }, (_, index) => ({ ...movement, id: index + 1 }));
const firstPage = { processId: 17, items: firstItems, page: 1, pageSize: 20, total: 21, totalPages: 2 };
const secondPage = { ...firstPage, items: [{ ...movement, id: 2, movementTitle: 'Movimento seguinte' }], page: 2 };
const summaryState = {
  processId: 17, status: 'not_generated', summary: null, attempt: null,
  message: 'Ainda não há um resumo para este processo.', failureCode: null,
  action: 'generate', serverTime: '2026-10-04T13:00:00.000Z',
};
