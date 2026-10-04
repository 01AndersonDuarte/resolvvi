import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AccessPanel, DispatchLayout } from './DispatchLayout';
import { FormField } from './FormField';
import { FormMessage } from './FormMessage';
import { PageTitle } from './PageTitle';
import { PrimaryButton } from './PrimaryButton';
import { ProgressRail } from './ProgressRail';
import { ProtectedBoundary } from './ProtectedBoundary';
import { SessionStatus } from './SessionStatus';

describe('shared interface components', () => {
  it('links field labels and validation messages to the input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormField id="email" label="E-mail" type="email" value="" autoComplete="email" onChange={onChange} error="Informe um e-mail válido." />);
    await user.type(screen.getByLabelText('E-mail'), 'a@b.com');
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-describedby', 'email-error');
  });

  it('renders help text and disabled fields', () => {
    render(<FormField id="password" label="Senha" type="password" value="" autoComplete="current-password" onChange={vi.fn()} helpText="Use sua senha." disabled />);
    expect(screen.getByText('Use sua senha.')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeDisabled();
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-describedby', 'password-help');
  });

  it('keeps form controls in keyboard focus order', async () => {
    const user = userEvent.setup();
    render(<><FormField id="email" label="E-mail" type="email" value="" autoComplete="email" onChange={vi.fn()} /><PrimaryButton>Continuar</PrimaryButton></>);
    await user.tab();
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Continuar' })).toHaveFocus();
  });

  it.each([
    ['info', 'status'], ['error', 'alert'], ['success', 'status'],
  ] as const)('announces %s messages through %s', (tone, role) => {
    render(<FormMessage message="Estado da solicitação" tone={tone} />);
    expect(screen.getByRole(role)).toHaveTextContent('Estado da solicitação');
  });

  it('shows button busy and disabled states and handles clicks', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<PrimaryButton busy onClick={onClick}>Continuar</PrimaryButton>);
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('connects panel title and description and renders the current step', () => {
    render(<DispatchLayout currentStep={2}><AccessPanel title="Consultar processo" description="Informe o número."><button>Enviar</button></AccessPanel></DispatchLayout>);
    expect(screen.getByRole('region', { name: 'Consultar processo' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Etapas da consulta' })).toBeInTheDocument();
    expect(screen.getByText('Consulta')).toHaveAttribute('class', expect.stringContaining('text-ink'));
    expect(screen.getByRole('heading', { name: 'Consultar processo' })).toHaveAttribute('id', 'page-title');
  });

  it('shows protected content only after the session is verified', () => {
    const { rerender } = render(<ProtectedBoundary authenticated={false}><p>Dados do processo</p></ProtectedBoundary>);
    expect(screen.queryByText('Dados do processo')).not.toBeInTheDocument();
    expect(screen.getByText(/só aparece depois/)).toBeInTheDocument();
    rerender(<ProtectedBoundary authenticated><p>Dados do processo</p></ProtectedBoundary>);
    expect(screen.getByText('Dados do processo')).toBeInTheDocument();
  });

  it('communicates session wait, unavailable, and pending logout states', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<SessionStatus status="checking" message={null} onRetry={onRetry} />);
    expect(screen.getByText('Verificando acesso…')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<SessionStatus status="unavailable" message="Falha temporária" onRetry={onRetry} />);
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    rerender(<SessionStatus status="logout-pending" message={null} onRetry={onRetry} />);
    expect(screen.getByRole('button', { name: 'Concluir saída' })).toBeInTheDocument();
  });

  it.each([1, 2, 3] as const)('marks step %s as current', (step) => {
    render(<ProgressRail currentStep={step} />);
    expect(screen.getByText(String(step))).toHaveAttribute('aria-current', 'step');
  });

  it('renders a page title description when supplied', () => {
    render(<PageTitle description="Orientação" >Acesso</PageTitle>);
    expect(screen.getByRole('heading', { name: 'Acesso' })).toBeInTheDocument();
    expect(screen.getByText('Orientação')).toBeInTheDocument();
  });
});
