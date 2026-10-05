import { describe, expect, it } from 'vitest';
import { readSummaryFeedbackResult } from './process-ai-summary-feedback';

describe('readSummaryFeedbackResult', () => {
  it('accepts a confirmed feedback value and outcome', () => {
    expect(readSummaryFeedbackResult({
      outcome: 'updated', feedback: { helpful: false, createdAt: '2026-10-04T13:00:00.000Z', updatedAt: '2026-10-04T13:01:00.000Z' },
    })).toEqual({
      outcome: 'updated', feedback: { helpful: false, createdAt: '2026-10-04T13:00:00.000Z', updatedAt: '2026-10-04T13:01:00.000Z' },
    });
  });

  it('rejects an unknown outcome or an unconfirmed feedback value', () => {
    expect(() => readSummaryFeedbackResult({ outcome: 'saved', feedback: null })).toThrow('Resposta da avaliação inválida.');
  });
});
