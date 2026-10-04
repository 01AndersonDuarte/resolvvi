import { describe, expect, it } from 'vitest';
import type { ProcessAiSummary, SummaryFeedbackRecord } from '../generated/prisma/client.js';
import type { PreparedSummarySource } from '../types/process-ai-summary.js';
import { serializeProcessAiSummary } from './summary-serialization-service.js';

const source: PreparedSummarySource = {
  processId: 42,
  movements: [{
    ref: 'm1', movementId: 901, processId: 42, date: '2026-09-01', title: 'Petição juntada',
    content: 'Texto original integral.', sourceOrder: 0,
  }],
  sourceHash: 'a'.repeat(64), eligibility: 'eligible', hasLimitedInformation: true,
};
const generatedAt = new Date('2026-10-04T13:00:08.000Z');
const summary = {
  id: '752a061e-31b0-44c4-bf41-c83e72670ea1',
  processId: 42,
  version: 1,
  slotId: '8722c8ab-af6f-434a-89e5-7965e66ae5c4',
  attemptId: 'f1792cfe-b7a3-4358-b7ab-22365389bda0',
  paragraphs: ['Foi registrada a inclusão de uma petição no processo.'],
  claims: [{ sentences: [{ text: 'Foi registrada a inclusão de uma petição no processo.', sourceRefs: ['m1'] }] }],
  generatedAt,
  myFeedback: null,
} as unknown as ProcessAiSummary & { myFeedback: SummaryFeedbackRecord | null };

describe('serializeProcessAiSummary', summarySerializationCases);

function summarySerializationCases(): void {
  it('resolves sentence references from the complete source snapshot', () => {
    const result = serializeProcessAiSummary(summary, source);

    expect(result).toMatchObject({
      id: summary.id,
      version: 1,
      paragraphs: ['Foi registrada a inclusão de uma petição no processo.'],
      generatedAt: generatedAt.toISOString(),
      movementCount: 1,
      myFeedback: null,
      references: [{
        movementId: 901,
        date: '01/09/2026',
        title: 'Petição juntada',
        paragraphIndex: 0,
        sentenceIndex: 0,
        sentenceText: 'Foi registrada a inclusão de uma petição no processo.',
      }],
    });
  });

  it('rejects persisted evidence that does not belong to the source snapshot', () => {
    const invalidSummary = {
      ...summary,
      claims: [{ sentences: [{ text: 'Foi registrada uma petição.', sourceRefs: ['m99'] }] }],
    } as unknown as typeof summary;

    expect(() => serializeProcessAiSummary(invalidSummary, source)).toThrow('Persisted summary reference is invalid.');
  });
}

describe('serializeProcessAiSummary paragraph data', () => {
  it('rejects persisted paragraphs outside the approved contract', () => {
    const invalidSummary = { ...summary, paragraphs: [] } as unknown as typeof summary;

    expect(() => serializeProcessAiSummary(invalidSummary, source)).toThrow('Persisted summary paragraphs are invalid.');
  });
});
