import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../contexts/auth-context';
import type { AuthContextValue } from '../contexts/auth-context';
import { INITIAL_SESSION_STATE } from '../contexts/session-state';
import { ApiRequestError } from '../services/http-client';
import type { AiSummary } from '../types/ai-summary';
import type { AiSummaryState } from '../types/ai-summary-state';
import { ProcessAiSummary } from './ProcessAiSummary';

const api = vi.hoisted(() => ({ read: vi.fn(), generate: vi.fn(), vote: vi.fn() }));
vi.mock('../services/process-ai-summary-service', () => ({
  getProcessAiSummary: api.read,
  requestProcessAiSummary: api.generate,
  saveProcessAiSummaryFeedback: api.vote,
}));

const availableStateSummary = {
  id: '752a061e-31b0-44c4-bf41-c83e72670ea1', version: 1,
  paragraphs: ['Uma petição foi juntada ao processo.'], generatedAt: '2026-10-04T13:00:08.000Z', movementCount: 21,
  references: [{ movementId: 9, date: '05/12/2023', title: 'Juntada de petição', paragraphIndex: 0, sentenceIndex: 0, sentenceText: 'Uma petição foi juntada ao processo.' }],
  myFeedback: null,
};
const availableState = makeState('available');

beforeEach(() => {
  vi.useRealTimers();
  api.read.mockReset().mockResolvedValue(availableState);
  api.generate.mockReset().mockResolvedValue(makeState('generating'));
  api.vote.mockReset().mockResolvedValue({ outcome: 'created', feedback: { helpful: true, createdAt: '2026-10-04T13:00:00.000Z', updatedAt: '2026-10-04T13:00:00.000Z' } });
});

describe('process AI summary section', () => {
  it('loads text, permanent notices and references without navigating the history', async () => {
    renderSummary();
    expect(await screen.findByText('Uma petição foi juntada ao processo.')).toBeInTheDocument();
    expect(screen.getByText(/Resumo gerado por inteligência artificial a partir das movimentações disponíveis/)).toBeInTheDocument();
    expect(screen.getByText('05/12/2023 · Juntada de petição')).toBeInTheDocument();
    expect(screen.getByText(/Confira manualmente cada evento/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(api.generate).not.toHaveBeenCalled();
  });

  it('starts generation only after an explicit click', async () => {
    api.read.mockResolvedValue(makeState('not_generated'));
    renderSummary();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Gerar resumo' }));
    await waitFor(() => expect(api.generate).toHaveBeenCalledTimes(1));
    expect(api.generate).toHaveBeenCalledWith(17, expect.any(AbortSignal));
  });

  it('reads once under StrictMode without submitting a generation', async () => {
    render(<StrictMode><Provider><ProcessAiSummary processId={17} /></Provider></StrictMode>);
    expect(await screen.findByText('Uma petição foi juntada ao processo.')).toBeInTheDocument();
    expect(api.read).toHaveBeenCalledTimes(1);
    expect(api.generate).not.toHaveBeenCalled();
  });

  it('does not offer generation when source information is insufficient', async () => {
    api.read.mockResolvedValue(makeState('insufficient_data'));
    renderSummary();
    expect(await screen.findByText('As informações disponíveis são insuficientes.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Gerar|Atualizar|Tentar novamente/ })).not.toBeInTheDocument();
  });

  it('does not generate automatically after a failed initial read', async () => {
    api.read.mockRejectedValue(new Error('offline'));
    renderSummary();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o resumo agora.');
    expect(api.generate).not.toHaveBeenCalled();
  });

  it('confirms a vote only after the save response arrives', async () => {
    let resolveVote!: (result: unknown) => void;
    api.vote.mockImplementation(() => new Promise((resolve) => { resolveVote = resolve; }));
    renderSummary();
    const user = userEvent.setup();
    const yes = await screen.findByRole('button', { name: 'Sim' });
    await user.click(yes);
    expect(yes).toBeDisabled();
    await act(async () => resolveVote({ outcome: 'created', feedback: { helpful: true, createdAt: '2026-10-04T13:00:00.000Z', updatedAt: '2026-10-04T13:00:00.000Z' } }));
    expect(await screen.findByText('Avaliação registrada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('preserves the confirmed vote when a replacement vote fails', async () => {
    api.read.mockResolvedValue(makeState('available', { ...availableStateSummary, myFeedback: confirmedFeedback }));
    api.vote.mockRejectedValue(new Error('offline'));
    renderSummary();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Não' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('O estado salvo foi consultado');
    expect(screen.getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Não' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reconciles a saved vote when the response is lost after the write', async () => {
    api.read.mockResolvedValueOnce(availableState).mockResolvedValueOnce(makeState('available', {
      ...availableStateSummary, myFeedback: confirmedFeedback,
    }));
    api.vote.mockRejectedValue(new Error('response lost'));
    renderSummary();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Sim' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('O estado salvo foi consultado');
    expect(screen.getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'true');
    expect(api.read).toHaveBeenCalledTimes(2);
  });

  it('reconciles a stale-version vote conflict from the server', async () => {
    api.vote.mockRejectedValue(new ApiRequestError('stale', 409, {
      code: 'SUMMARY_NOT_CURRENT', message: 'stale', field: null, retryAfterSeconds: null,
    }));
    api.read.mockResolvedValueOnce(availableState).mockResolvedValueOnce(makeState('available', {
      ...availableStateSummary, id: 'f1792cfe-b7a3-4358-b7ab-22365389bda0', version: 2,
    }));
    renderSummary();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Sim' }));

    expect(await screen.findByText('Este resumo mudou. A avaliação foi atualizada; confira a versão exibida.')).toBeInTheDocument();
    expect(await screen.findByText(/Versão 2/)).toBeInTheDocument();
  });

  it('discards a response from a process that was replaced while loading', async () => {
    let resolvePrevious!: (state: AiSummaryState) => void;
    api.read.mockImplementationOnce(() => new Promise((resolve) => { resolvePrevious = resolve; }))
      .mockResolvedValueOnce(makeState('available', { ...availableStateSummary, paragraphs: ['Resumo do novo processo.'] }, 18));
    const view = render(<Provider><ProcessAiSummary processId={17} /></Provider>);
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 1)));
    view.rerender(<Provider><ProcessAiSummary processId={18} /></Provider>);
    expect(await screen.findByText('Resumo do novo processo.')).toBeInTheDocument();
    await act(async () => resolvePrevious(makeState('available')));
    expect(screen.queryByText('Uma petição foi juntada ao processo.')).not.toBeInTheDocument();
  });

  it('stops polling at the server deadline and offers a manual status refresh', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T13:00:00.000Z'));
    api.read.mockImplementation(() => Promise.resolve({
      ...makeState('generating'), serverTime: new Date(Date.now()).toISOString(),
    }));
    renderSummary();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText(/acompanhará a tentativa por até 30 segundos/)).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTimeAsync(30_000));

    expect(screen.getByRole('alert')).toHaveTextContent('A geração demorou mais que o esperado');
    const callsAfterDeadline = api.read.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(api.read).toHaveBeenCalledTimes(callsAfterDeadline);
    vi.useRealTimers();
  });
});

function makeState(
  status: AiSummaryState['status'],
  summary: AiSummary = availableStateSummary,
  processId = 17,
): AiSummaryState {
  return {
    processId, status, summary: status === 'available' ? summary : null,
    attempt: status === 'generating' ? { id: 'f1792cfe-b7a3-4358-b7ab-22365389bda0', startedAt: '2026-10-04T13:00:00.000Z', deadlineAt: '2026-10-04T13:00:30.000Z', retryAt: '2026-10-04T13:00:30.000Z' } : null,
    message: status === 'insufficient_data' ? 'As informações disponíveis são insuficientes.' : null,
    failureCode: null, action: status === 'not_generated' ? 'generate' : 'none', serverTime: '2026-10-04T13:00:00.000Z',
  };
}

const confirmedFeedback = { helpful: true, createdAt: '2026-10-04T12:00:00.000Z', updatedAt: '2026-10-04T12:00:00.000Z' };

function Provider({ children }: { children: React.ReactNode }) {
  const context: AuthContextValue = {
    state: { ...INITIAL_SESSION_STATE, status: 'authenticated', generation: 1, session: {
      sessionId: 'session-one', expiresAt: '2030-01-01T01:00:00Z', serverTime: '2030-01-01T00:00:00Z', receivedAt: 1,
    } },
    refresh: vi.fn(), completeLogin: vi.fn(), logout: vi.fn(async () => true), invalidate: vi.fn(),
  };
  return <AuthContext.Provider value={context}>{children}</AuthContext.Provider>;
}

function renderSummary() {
  return render(<Provider><ProcessAiSummary processId={17} /></Provider>);
}
