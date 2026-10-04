import { describe, expect, it } from 'vitest';
import { providerSummaryOutputSchema, sourceMovementsSchema } from './process-ai-summary-schema.js';

describe('process AI summary schemas', () => {
  it('accepts the canonical source and rejects missing fields, extra fields, and invalid dates', () => {
    const movement = { ref: 'm1', movementId: 1, processId: 2, date: '2026-01-01', title: 'Petição juntada', content: null, sourceOrder: 0 };
    expect(sourceMovementsSchema.validate([movement]).error).toBeUndefined();
    expect(sourceMovementsSchema.validate([{ ...movement, date: '01/01/2026' }]).error).toBeDefined();
    expect(sourceMovementsSchema.validate([{ ...movement, unexpected: true }]).error).toBeDefined();
    expect(sourceMovementsSchema.validate([{ ...movement, title: 'x'.repeat(100_001) }]).error).toBeDefined();
  });

  it('requires strict provider properties and one to three nonempty paragraphs', () => {
    const valid = { language: 'pt-BR', paragraphs: [{ sentences: [{ text: 'Foi juntada uma petição.', sourceRefs: ['m1'] }] }] };
    expect(providerSummaryOutputSchema.validate(valid, { convert: false }).error).toBeUndefined();
    expect(providerSummaryOutputSchema.validate({ ...valid, extra: true }).error).toBeDefined();
    expect(providerSummaryOutputSchema.validate({ ...valid, paragraphs: [] }).error).toBeDefined();
    expect(providerSummaryOutputSchema.validate({ ...valid, paragraphs: Array.from({ length: 4 }, () => valid.paragraphs[0]) }).error).toBeDefined();
    expect(providerSummaryOutputSchema.validate({ ...valid, paragraphs: [{ sentences: [] }] }).error).toBeDefined();
  });
});
