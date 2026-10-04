import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextValue } from '../contexts/auth-context';
import { AuthContext } from '../contexts/auth-context';
import { INITIAL_SESSION_STATE } from '../contexts/session-state';
import { ApiRequestError } from '../services/http-client';
import { loginAccount, registerAccount } from '../services/auth-service';
import { LoginView } from './LoginView';
import { SignUpView } from './SignUpView';

vi.mock('../services/auth-service', () => ({
  loginAccount: vi.fn(),
  registerAccount: vi.fn(),
}));

type RouteEntry = string | { pathname: string; state: Record<string, unknown> };

beforeEach(() => vi.resetAllMocks());

describe('SignUpView', () => {
  it('associa erros aos campos e move o foco para o primeiro valor inválido', async () => {
    const user = userEvent.setup();
    renderAuthJourney('/criar-conta');

    expect(screen.getByRole('heading', { name: 'Crie sua conta' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-describedby', 'email-error');
    expect(screen.getByText('Informe um e-mail válido.')).toHaveAttribute('id', 'email-error');

    await user.type(screen.getByLabelText('E-mail'), 'pessoa@example.com');
    await user.type(screen.getByLabelText('Senha'), '1234567');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByLabelText('Senha')).toHaveFocus();
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-describedby', 'password-error');
    expect(screen.getByText('Use uma senha de 8 a 128 caracteres.')).toHaveAttribute('id', 'password-error');
    expect(registerAccount).not.toHaveBeenCalled();
  });

  it('preserva a senha, normaliza o e-mail e bloqueia envios repetidos por Enter', async () => {
    const user = userEvent.setup();
    const request = deferred<{ message: string }>();
    vi.mocked(registerAccount).mockReturnValue(request.promise);
    renderAuthJourney('/criar-conta');

    await user.type(screen.getByLabelText('E-mail'), ' Pessoa@Example.COM ');
    await user.type(screen.getByLabelText('Senha'), ' senha 123 ');
    await user.keyboard('{Enter}{Enter}');

    expect(registerAccount).toHaveBeenCalledOnce();
    expect(registerAccount).toHaveBeenCalledWith(
      { email: 'pessoa@example.com', password: ' senha 123 ' },
      expect.any(AbortSignal),
    );
    expect(screen.getByRole('button', { name: 'Criando conta…' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Criando conta…');

    await act(async () => request.resolve({ message: 'Cadastro aceito.' }));
  });

  it('navega ao estado pendente após cadastro aceito', async () => {
    const user = userEvent.setup();
    vi.mocked(registerAccount).mockResolvedValue({
      message: 'Conta criada. Entre com seu e-mail e senha.',
    });
    renderAuthJourney('/criar-conta');

    await fillCredentials(user, 'nova@example.com', 'senha válida');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByRole('heading', { name: 'Entre para continuar' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('nova@example.com');
    expect(screen.getByRole('status')).toHaveTextContent('Conta criada. Entre com seu e-mail e senha.');
  });

  it('mostra erro recuperável sem orientar ações de e-mail', async () => {
    const user = userEvent.setup();
    vi.mocked(registerAccount).mockRejectedValue(new Error('network timeout'));
    renderAuthJourney('/criar-conta');

    await fillCredentials(user, 'nova@example.com', 'senha válida');
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir o cadastro agora.');
  });
});

describe('LoginView', () => {
  it('exibe a mensagem comum de credenciais e mantém o e-mail informado', async () => {
    const user = userEvent.setup();
    vi.mocked(loginAccount).mockRejectedValue(apiFailure({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'E-mail ou senha incorretos.',
    }));
    renderAuthJourney({ pathname: '/entrar', state: { email: 'pessoa@example.com' } });

    await user.type(screen.getByLabelText('Senha'), 'senha incorreta');
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-mail ou senha incorretos. Confira os dados e tente novamente.',
    );
    expect(screen.getByLabelText('E-mail')).toHaveValue('pessoa@example.com');
  });

  it('conclui somente uma entrada enquanto a resposta está pendente', async () => {
    const user = userEvent.setup();
    const request = deferred<{ sessionId: string; expiresAt: string; serverTime: string }>();
    const session = createSessionValue();
    vi.mocked(loginAccount).mockReturnValue(request.promise);
    renderAuthJourney('/entrar', session);

    await fillCredentials(user, 'pessoa@example.com', 'senha correta');
    await user.keyboard('{Enter}{Enter}');
    expect(loginAccount).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled();

    const response = {
      sessionId: 'session-1',
      expiresAt: '2030-01-01T01:00:00.000Z',
      serverTime: '2030-01-01T00:00:00.000Z',
    };
    await act(async () => request.resolve(response));
    await waitFor(() => expect(session.completeLogin).toHaveBeenCalledWith(response));
  });
});

async function fillCredentials(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
  password: string,
): Promise<void> {
  await user.type(screen.getByLabelText('E-mail'), email);
  await user.type(screen.getByLabelText('Senha'), password);
}

function renderAuthJourney(entry: RouteEntry, session = createSessionValue()): void {
  render(
    <AuthContext.Provider value={session}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/entrar" element={<LoginView />} />
          <Route path="/criar-conta" element={<SignUpView />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

function createSessionValue(): AuthContextValue {
  return {
    state: { ...INITIAL_SESSION_STATE, status: 'anonymous' },
    refresh: vi.fn(),
    completeLogin: vi.fn(),
    logout: vi.fn().mockResolvedValue(true),
    invalidate: vi.fn(),
  };
}

function apiFailure(input: { status: number; code: string; message: string }): ApiRequestError {
  return new ApiRequestError(input.message, input.status, {
    code: input.code,
    message: input.message,
    field: null,
    retryAfterSeconds: null,
  });
}

function deferred<TData>(): { promise: Promise<TData>; resolve: (value: TData) => void } {
  let resolve!: (value: TData) => void;
  const promise = new Promise<TData>((complete) => { resolve = complete; });

  return { promise, resolve };
}
