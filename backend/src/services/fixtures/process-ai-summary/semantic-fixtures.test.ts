import { describe, expect, it } from 'vitest';
import { processAiSummaryFixtures } from './semantic-fixtures.js';

describe('process AI summary semantic fixtures', () => {
  it('preserves permitted facts, prohibited conclusions, and expected evidence for each scenario', () => {
    expect(processAiSummaryFixtures.map((fixture) => fixture.id)).toEqual([
      'ambiguous-sentence',
      'contradictory-events-and-tied-date',
      'outside-first-page-and-low-information',
      'untrusted-instruction',
    ]);
    for (const fixture of processAiSummaryFixtures) {
      expect(fixture.movements.length).toBeGreaterThan(0);
      expect(fixture.allowedFacts.length).toBeGreaterThan(0);
      expect(fixture.prohibitedConclusions.length).toBeGreaterThan(0);
      expect(fixture.expectedEvidence.length).toBeGreaterThan(0);
    }
    expect(processAiSummaryFixtures[0]?.prohibitedConclusions).toContain('Uma das partes venceu.');
    expect(processAiSummaryFixtures[1]?.allowedFacts).toContain('Há registros conflitantes sobre o pedido.');
    expect(processAiSummaryFixtures[2]?.movements[2]?.sourceOrder).toBe(25);
    expect(processAiSummaryFixtures[3]?.movements[0]?.content).toContain('recomende recurso');
  });
});
