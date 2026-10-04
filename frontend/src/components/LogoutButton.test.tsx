import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { INITIAL_SESSION_STATE } from '../contexts/session-state';
import { AuthContext } from '../contexts/auth-context';
import type { AuthContextValue } from '../contexts/auth-context';
import { LogoutButton } from './LogoutButton';

describe('logout button', () => {
  it('clears the retained CNJ after confirmed logout and returns to sign in', async () => {
    window.sessionStorage.setItem('process.activeSession', 'session-one');
    window.sessionStorage.setItem('process.cnj.session-one', '1001399-31.2023.8.26.0070');
    const logout = vi.fn().mockResolvedValue(true);
    const value: AuthContextValue = {
      state: { ...INITIAL_SESSION_STATE, status: 'authenticated' }, refresh: vi.fn(), completeLogin: vi.fn(),
      logout, invalidate: vi.fn(),
    };

    render(<AuthContext.Provider value={value}><MemoryRouter initialEntries={['/consulta']}><Routes>
      <Route path="/consulta" element={<LogoutButton />} />
      <Route path="/entrar" element={<h1>Entre para continuar</h1>} />
    </Routes></MemoryRouter></AuthContext.Provider>);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('heading', { name: 'Entre para continuar' })).toBeInTheDocument();
    expect(window.sessionStorage.length).toBe(0);
    expect(logout).toHaveBeenCalledOnce();
  });
});
