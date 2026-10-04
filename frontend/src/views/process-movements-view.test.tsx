import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextValue } from '../contexts/auth-context';
import { AuthContext } from '../contexts/auth-context';
import { INITIAL_SESSION_STATE } from '../contexts/session-state';
import { ApiRequestError } from '../services/http-client';
import type { MovementPage } from '../types/movement-page';
import type { ProcessDetails } from '../types/process-details';
import { ProcessFoundView } from './ProcessFoundView';

const processDetails: ProcessDetails = {
  id: 17,
  cnj: '1001399-31.2023.8.26.0070',
  forum: 'Foro de Batatais',
  court: '2ª Vara Cível',
  lawsuitValue: '10.000,00',
  numberOfAuthors: 0,
};
const firstPage: MovementPage = {
  processId: 17,
  items: [{ id: 1, movementDate: '05/12/2023', movementTitle: 'Movimento inicial', movementContent: 'Conteúdo inicial' }],
  page: 1,
  pageSize: 20,
  total: 21,
  totalPages: 2,
};
const secondPage: MovementPage = {
  ...firstPage,
  items: [{ ...firstPage.items[0], id: 2, movementTitle: 'Movimento seguinte' }],
  page: 2,
};
const api = vi.hoisted(() => ({ getProcessById: vi.fn(), getProcessMovements: vi.fn() }));

vi.mock('../services/process-service', () => api);

beforeEach(() => {
  api.getProcessById.mockReset().mockResolvedValue(processDetails);
  api.getProcessMovements.mockReset().mockResolvedValue(firstPage);
});

describe('process movement section', () => {
  it('keeps process details and the confirmed history page while retrying a failed destination', async () => {
    let failedDestination = false;
    api.getProcessMovements.mockImplementation(({ page }: { page: number }) => {
      if (page === 2 && !failedDestination) {
        failedDestination = true;
        return Promise.reject(new Error('offline'));
      }
      return Promise.resolve(page === 1 ? firstPage : secondPage);
    });
    renderFound();
    const user = userEvent.setup();
    await screen.findByText('Movimento inicial');
    await user.click(screen.getByRole('button', { name: 'Próxima' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar');
    expect(screen.getByText('Foro de Batatais')).toBeInTheDocument();
    expect(screen.getByText('Movimento inicial')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Movimento seguinte')).toBeInTheDocument();
    expect(screen.getByText('Foro de Batatais')).toBeInTheDocument();
  });

  it('resets expanded movement content after a page is confirmed', async () => {
    const longContent = 'conteúdo '.repeat(70);
    api.getProcessMovements.mockResolvedValueOnce({
      ...firstPage,
      items: [{ ...firstPage.items[0], movementContent: longContent }],
    }).mockResolvedValueOnce({
      ...secondPage,
      items: [{ ...secondPage.items[0], movementContent: longContent }],
    });
    renderFound();
    const user = userEvent.setup();
    await screen.findByText('Movimento inicial');
    await user.click(screen.getByRole('button', { name: 'Ver conteúdo completo' }));
    expect(screen.getByRole('button', { name: 'Recolher' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Próxima' }));

    expect(await screen.findByText('Movimento seguinte')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver conteúdo completo' })).toBeInTheDocument();
  });

  it('revalidates details when the movement endpoint reports a missing process', async () => {
    api.getProcessById.mockResolvedValueOnce(processDetails).mockRejectedValueOnce(notFoundError());
    api.getProcessMovements.mockRejectedValueOnce(notFoundError());
    renderFound();

    expect(await screen.findByText('Não encontramos esse processo na base disponível.')).toBeInTheDocument();
    expect(screen.queryByText('Foro de Batatais')).not.toBeInTheDocument();
    expect(api.getProcessById).toHaveBeenCalledTimes(2);
  });

  it('distinguishes an empty history from an event with missing fields', async () => {
    api.getProcessMovements.mockResolvedValueOnce({ ...firstPage, items: [], total: 0, totalPages: 0 });
    renderFound();

    expect(await screen.findByText('Nenhuma movimentação disponível na base para este processo.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Paginação das movimentações' })).not.toBeInTheDocument();
  });
});

function renderFound() {
  return render(<Provider><MemoryRouter initialEntries={['/processos/17']}><Routes>
    <Route path="/processos/:id" element={<ProcessFoundView />} />
  </Routes></MemoryRouter></Provider>);
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

function notFoundError(): ApiRequestError {
  return new ApiRequestError('missing', 404, {
    code: 'PROCESS_NOT_FOUND', message: 'internal', field: null, retryAfterSeconds: null,
  });
}
