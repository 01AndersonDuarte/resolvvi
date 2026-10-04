import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type { AuthContextValue } from './contexts/auth-context';
import { INITIAL_SESSION_STATE } from './contexts/session-state';
import { AuthContext } from './contexts/auth-context';

const sessionValue = (status: AuthContextValue['state']['status']): AuthContextValue => ({
  state: { ...INITIAL_SESSION_STATE, status, session: status === 'authenticated' ? {
    sessionId: 's1', expiresAt: '2030-01-01T01:00:00Z', serverTime: '2030-01-01T00:00:00Z', receivedAt: 1,
  } : null },
  refresh: vi.fn(), completeLogin: vi.fn(), logout: vi.fn().mockResolvedValue(false), invalidate: vi.fn(),
});

describe('application routes', () => {
  it('renders the protected route only when authenticated', async () => {
    const value = sessionValue('authenticated');
    render(<AuthContext.Provider value={value}><MemoryRouter initialEntries={['/consulta']}><App /></MemoryRouter></AuthContext.Provider>);
    expect(await screen.findByText('Área protegida')).toBeInTheDocument();
    expect(screen.getByText(/estará disponível/)).toBeInTheDocument();
  });

  it('redirects anonymous protected routes to the access screen', async () => {
    render(<AuthContext.Provider value={sessionValue('anonymous')}><MemoryRouter initialEntries={['/consulta']}><App /></MemoryRouter></AuthContext.Provider>);
    expect(await screen.findByRole('heading', { name: 'Entre para continuar' })).toBeInTheDocument();
  });

  it('offers retry while session service is unavailable and resolves unknown paths', async () => {
    const value = sessionValue('unavailable');
    render(<AuthContext.Provider value={value}><MemoryRouter initialEntries={['/qualquer-lugar']}><App /></MemoryRouter></AuthContext.Provider>);
    expect(await screen.findByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Entre para continuar' })).toBeInTheDocument());
  });

  it('routes authenticated users away from entry and shows pending logout recovery', () => {
    const signedIn = sessionValue('authenticated');
    const { rerender } = render(<AuthContext.Provider value={signedIn}><MemoryRouter initialEntries={['/entrar']}><App /></MemoryRouter></AuthContext.Provider>);
    expect(screen.getByRole('heading', { name: 'Acesso confirmado' })).toBeInTheDocument();
    rerender(<AuthContext.Provider value={sessionValue('logout-pending')}><MemoryRouter initialEntries={['/entrar']}><App /></MemoryRouter></AuthContext.Provider>);
    expect(screen.getByRole('button', { name: 'Concluir saída' })).toBeInTheDocument();
  });

  it('shows the checking status on entry while session confirmation is pending', () => {
    render(<AuthContext.Provider value={sessionValue('checking')}><MemoryRouter initialEntries={['/entrar']}><App /></MemoryRouter></AuthContext.Provider>);
    expect(screen.getByText('Verificando acesso…')).toBeInTheDocument();
    expect(screen.getByText(/só aparece depois/)).toBeInTheDocument();
  });
});
