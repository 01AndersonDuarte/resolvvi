import { describe, expect, it } from 'vitest';
import {
  parseSummaryFeedbackBody,
  parseSummaryGenerationBody,
  parseSummaryId,
  parseSummaryReadQuery,
  providerSummaryOutputSchema,
  sourceMovementsSchema,
} from './process-ai-summary-schema.js';

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

describe('process AI summary request schemas', () => {
  it('allows only an optional UUID attempt identifier in reads', () => {
    expect(parseSummaryReadQuery({ attemptId: '752a061e-31b0-44c4-bf41-c83e72670ea1' })).toEqual({
      attemptId: '752a061e-31b0-44c4-bf41-c83e72670ea1',
    });
    expect(parseSummaryReadQuery({ track: false })).toEqual({ track: false });
    expect(() => parseSummaryReadQuery({ track: 'false' })).toThrow();
    expect(() => parseSummaryReadQuery({ page: '2' })).toThrow();
    expect(() => parseSummaryReadQuery({ attemptId: 'invalid' })).toThrow();
  });

  it('accepts only an empty generation body', () => {
    expect(parseSummaryGenerationBody({})).toEqual({});
    expect(() => parseSummaryGenerationBody({ history: [] })).toThrow();
  });

  it('requires a strict boolean for feedback and validates summary IDs', () => {
    expect(parseSummaryFeedbackBody({ helpful: false })).toEqual({ helpful: false });
    expect(() => parseSummaryFeedbackBody({ helpful: 'false' })).toThrow();
    expect(() => parseSummaryFeedbackBody({ helpful: true, userId: 'spoofed' })).toThrow();
    expect(parseSummaryId('752a061e-31b0-44c4-bf41-c83e72670ea1')).toBe('752a061e-31b0-44c4-bf41-c83e72670ea1');
    expect(() => parseSummaryId('wrong')).toThrow();
  });
});
