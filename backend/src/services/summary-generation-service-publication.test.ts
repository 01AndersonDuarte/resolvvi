import { describe, expect, it } from 'vitest';
import { createSummaryPublication } from './summary-publication-service.js';
import type { SummaryGenerationJob } from './summary-generation-types.js';
import type { SummaryProviderResult, ValidatedSummary } from '../types/summary-provider.js';

describe('summary publication mapping', () => {
  it('flattens validated paragraphs and retains generation evidence', () => {
    const job = createJob();
    const validated = createValidatedSummary();
    const providerResult = createProviderResult();
    const now = new Date('2026-10-05T10:00:00.000Z');
    const deadlineAt = new Date('2026-10-05T10:00:30.000Z');

    const publication = createSummaryPublication({ job, validated, providerResult, now, deadlineAt });

    expect(publication).toMatchObject({
      processId: job.processId,
      slotId: job.slotId,
      attemptId: job.attemptId,
      rulesVersion: job.rulesVersion,
      paragraphs: ['Primeira frase. Segunda frase.', 'Terceira frase.'],
      claims: validated.output.paragraphs,
      now,
      deadlineAt,
      usage: providerResult.usage,
      providerRequestId: providerResult.providerRequestId,
    });
  });
});

function createJob(): SummaryGenerationJob {
  return {
    processId: 17,
    slotId: 'slot-1',
    attemptId: 'attempt-1',
    sessionId: 'session-1',
    rulesVersion: 'summary-rules-v14',
    source: {
      processId: 17,
      movements: [],
      sourceHash: 'source-hash',
      eligibility: 'eligible',
      hasLimitedInformation: false,
    },
    requestedAt: 1,
    startedAt: new Date('2026-10-05T10:00:00.000Z'),
  };
}

function createValidatedSummary(): ValidatedSummary {
  return {
    output: {
      language: 'pt-BR',
      paragraphs: [
        { sentences: [
          { text: 'Primeira frase.', sourceRefs: ['m1'] },
          { text: 'Segunda frase.', sourceRefs: ['m1', 'm2'] },
        ] },
        { sentences: [
          { text: 'Terceira frase.', sourceRefs: ['m2'] },
        ] },
      ],
    },
    body: 'Primeira frase. Segunda frase.\n\nTerceira frase.',
    references: [],
  };
}

function createProviderResult(): SummaryProviderResult {
  return {
    status: 'completed',
    output: {},
    refusal: null,
    model: 'test-model',
    usage: { inputTokens: 80, outputTokens: 40 },
    providerRequestId: 'request-1',
  };
}
