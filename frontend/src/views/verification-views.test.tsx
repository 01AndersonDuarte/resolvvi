import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextValue } from '../contexts/auth-context';
import { AuthContext } from '../contexts/auth-context';
import { INITIAL_SESSION_STATE } from '../contexts/session-state';
import { confirmEmail, resendVerification } from '../services/auth-service';
import { ApiRequestError } from '../services/http-client';
import { EmailVerificationView } from './EmailVerificationView';
import { ResendVerificationView } from './ResendVerificationView';

vi.mock('../services/auth-service', () => ({
  confirmEmail: vi.fn(),
  loginAccount: vi.fn(),
  registerAccount: vi.fn(),
  resendVerification: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

describe('EmailVerificationView', () => {
  it('explica o link ausente sem consumir confirmação automaticamente', () => {
    const session = createSessionValue();
    renderVerification(null, session);

    expect(screen.getByRole('heading', { name: 'Confirme seu e-mail' })).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Este link não é mais válido.');
    expect(screen.queryByRole('button', { name: 'Confirmar e-mail' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
    expect(confirmEmail).not.toHaveBeenCalled();
    expect(session.completeLogin).not.toHaveBeenCalled();
  });

  it('confirma somente por ação explícita, bloqueia repetição e não inicia sessão', async () => {
    const user = userEvent.setup();
    const request = deferred<{ message: string }>();
    const session = createSessionValue();
    vi.mocked(confirmEmail).mockReturnValue(request.promise);
    renderVerification('token-secreto', session);

    expect(confirmEmail).not.toHaveBeenCalled();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Confirmar e-mail' })).toHaveFocus();
    await user.keyboard('{Enter}{Enter}');
    expect(confirmEmail).toHaveBeenCalledOnce();
    expect(confirmEmail).toHaveBeenCalledWith('token-secreto', expect.any(AbortSignal));
    expect(screen.getByRole('button', { name: 'Confirmando e-mail…' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Confirmando e-mail…');

    await act(async () => request.resolve({ message: 'E-mail confirmado. Agora você pode entrar.' }));
    expect(await screen.findByRole('status')).toHaveTextContent('E-mail confirmado. Agora você pode entrar.');
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument();
    expect(session.completeLogin).not.toHaveBeenCalled();
  });

  it('oferece entrada e reenvio quando o backend recusa o link', async () => {
    const user = userEvent.setup();
    vi.mocked(confirmEmail).mockRejectedValue(apiFailure({
      status: 400,
      code: 'VERIFICATION_INVALID',
      message: 'Link recusado.',
      retryAfterSeconds: null,
    }));
    renderVerification('token-invalido');

    await user.click(screen.getByRole('button', { name: 'Confirmar e-mail' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este link não é mais válido. Solicite outra confirmação ou entre se já confirmou seu e-mail.',
    );
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reenviar confirmação' })).toBeInTheDocument();
  });
});

describe('ResendVerificationView', () => {
  it('valida o e-mail, associa o erro e devolve o foco ao campo', async () => {
    const user = userEvent.setup();
    renderResend('/reenviar-confirmacao');

    await user.click(screen.getByRole('button', { name: 'Reenviar confirmação' }));
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-describedby', 'email-error');
    expect(screen.getByText('Informe um e-mail válido.')).toHaveAttribute('id', 'email-error');
    expect(resendVerification).not.toHaveBeenCalled();
  });

  it('preserva o e-mail, impede duplicidade e anuncia a resposta neutra', async () => {
    const user = userEvent.setup();
    const request = deferred<{ message: string }>();
    vi.mocked(resendVerification).mockReturnValue(request.promise);
    renderResend({ pathname: '/reenviar-confirmacao', state: { email: ' Pessoa@Example.COM ' } });

    expect(screen.getByLabelText('E-mail')).toHaveValue('Pessoa@Example.COM');
    screen.getByLabelText('E-mail').focus();
    await user.keyboard('{Enter}{Enter}');
    expect(resendVerification).toHaveBeenCalledOnce();
    expect(resendVerification).toHaveBeenCalledWith(
      { email: 'pessoa@example.com' },
      expect.any(AbortSignal),
    );
    expect(screen.getByRole('button', { name: 'Solicitando confirmação…' })).toBeDisabled();

    await act(async () => request.resolve({
      message: 'Se houver confirmação pendente para este e-mail, enviaremos as instruções.',
    }));
    expect(await screen.findByText('Se houver confirmação pendente para este e-mail, enviaremos as instruções.')).toHaveAttribute('role', 'status');
    expect(screen.getByText('Tente novamente em 60 segundos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reenviar confirmação' })).toBeDisabled();
  });

  it('informa o tempo restante devolvido pelo limite da API', async () => {
    const user = userEvent.setup();
    vi.mocked(resendVerification).mockRejectedValue(apiFailure({
      status: 429,
      code: 'VERIFICATION_RATE_LIMITED',
      message: 'Aguarde para solicitar outro e-mail.',
      retryAfterSeconds: 42,
    }));
    renderResend('/reenviar-confirmacao');

    await user.type(screen.getByLabelText('E-mail'), 'pessoa@example.com');
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Aguarde para solicitar outro e-mail.');
    expect(screen.getByText('Tente novamente em 42 segundos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reenviar confirmação' })).toBeDisabled();
  });
});

function renderVerification(token: string | null, session = createSessionValue()): void {
  render(
    <AuthContext.Provider value={session}>
      <MemoryRouter><EmailVerificationView token={token} /></MemoryRouter>
    </AuthContext.Provider>,
  );
}

function renderResend(
  entry: string | { pathname: string; state: Record<string, string> },
  session = createSessionValue(),
): void {
  render(
    <AuthContext.Provider value={session}>
      <MemoryRouter initialEntries={[entry]}><ResendVerificationView /></MemoryRouter>
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

function apiFailure(input: {
  status: number;
  code: string;
  message: string;
  retryAfterSeconds: number | null;
}): ApiRequestError {
  return new ApiRequestError(input.message, input.status, {
    code: input.code,
    message: input.message,
    field: null,
    retryAfterSeconds: input.retryAfterSeconds,
  });
}

function deferred<TData>(): { promise: Promise<TData>; resolve: (value: TData) => void } {
  let resolve!: (value: TData) => void;
  const promise = new Promise<TData>((complete) => { resolve = complete; });

  return { promise, resolve };
}
