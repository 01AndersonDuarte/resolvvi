import { describe, expect, it } from 'vitest';
import { readAiSummaryState } from './process-ai-summary-response';

const processId = 17;
const baseState = {
  processId,
  status: 'available',
  summary: {
    id: '752a061e-31b0-44c4-bf41-c83e72670ea1', version: 1,
    paragraphs: ['Uma petição foi juntada ao processo.'], generatedAt: '2026-10-04T13:00:08.000Z',
    movementCount: 21,
    references: [{ movementId: 9, date: '05/12/2023', title: 'Juntada de petição', paragraphIndex: 0, sentenceIndex: 0, sentenceText: 'Uma petição foi juntada ao processo.' }],
    myFeedback: null,
  },
  attempt: null, message: null, failureCode: null, action: 'none', serverTime: '2026-10-04T13:01:00.000Z',
};

describe('readAiSummaryState', () => {
  it('accepts available summaries with paragraph references and metadata', () => {
    expect(readAiSummaryState(baseState, processId)).toEqual(baseState);
  });

  it('rejects a response for another process', () => {
    expect(() => readAiSummaryState({ ...baseState, processId: 18 }, processId)).toThrow('Resposta do resumo processual inválida.');
  });

  it('rejects a summary with an unsupported number of paragraphs', () => {
    const summary = { ...baseState.summary, paragraphs: ['um', 'dois', 'três', 'quatro'] };
    expect(() => readAiSummaryState({ ...baseState, summary }, processId)).toThrow('Resposta do resumo processual inválida.');
  });

  it('requires a summary only when the state is available', () => {
    expect(() => readAiSummaryState({ ...baseState, status: 'not_generated', action: 'generate' }, processId))
      .toThrow('Resposta do resumo processual inválida.');
  });

  it('requires an attempt while a generation is active', () => {
    expect(() => readAiSummaryState({ ...baseState, status: 'generating', summary: null, action: 'none' }, processId))
      .toThrow('Resposta do resumo processual inválida.');
  });
});
