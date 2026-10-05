import { expect, it } from 'vitest';
import { processAiSummaryFixtures } from './semantic-fixtures.js';

it('preserves permitted facts, prohibited conclusions, and expected evidence for each scenario', () => {
  expect(processAiSummaryFixtures.map((fixture) => fixture.id)).toEqual([
    'ambiguous-sentence',
    'contradictory-events-and-tied-date',
    'outside-first-page-and-low-information',
    'untrusted-instruction',
    'one-event-and-unknown-overall-status',
    'enforcement-objection-keeps-procedural-meaning',
    'dismissal-request-does-not-infer-legal-effect',
    'objection-preserves-unspecified-scope',
    'return-to-origin-does-not-infer-next-step',
    'unknown-actor-is-not-invented',
    'despacho-without-explicit-actor-stays-passive',
  ]);
  for (const fixture of processAiSummaryFixtures) {
    expect(fixture.movements.length).toBeGreaterThan(0);
    expect(fixture.allowedFacts.length).toBeGreaterThan(0);
    expect(fixture.prohibitedConclusions.length).toBeGreaterThan(0);
    expect(fixture.expectedEvidence.length).toBeGreaterThan(0);
  }
});

it('protects uncertain outcomes, procedural meaning, and unspecified actors', () => {
  expect(processAiSummaryFixtures[0]?.prohibitedConclusions).toContain('Uma das partes venceu.');
  expect(processAiSummaryFixtures[1]?.allowedFacts).toContain('Há registros conflitantes sobre o pedido.');
  expect(processAiSummaryFixtures[2]?.movements[2]?.sourceOrder).toBe(25);
  expect(processAiSummaryFixtures[3]?.movements[0]?.content).toContain('recomende recurso');
  expect(processAiSummaryFixtures[4]?.allowedFacts).toContain('O histórico disponível não permite determinar a situação geral do processo.');
  expect(processAiSummaryFixtures[5]?.prohibitedConclusions).toContain('A parte devedora apresentou contestação.');
  expect(processAiSummaryFixtures[6]?.prohibitedConclusions).toContain('O pedido encerra o processo sem julgamento do mérito.');
  expect(processAiSummaryFixtures[7]?.prohibitedConclusions).toContain('A parte devedora foi intimada a impugnar o valor cobrado.');
  expect(processAiSummaryFixtures[8]?.prohibitedConclusions).toContain('Os autos retornaram à vara de origem para prosseguimento.');
  expect(processAiSummaryFixtures[9]?.prohibitedConclusions).toContain('O juiz autorizou a perícia.');
  expect(processAiSummaryFixtures[10]?.prohibitedConclusions).toContain('O juiz determinou que a parte autora complementasse os documentos do pedido.');
});

it('preserves synthetic response sentences supported by allowed facts', () => {
  for (const fixture of processAiSummaryFixtures) {
    const preservedSentences = fixture.preservedResponse.map(({ sentence }) => sentence);
    expect(preservedSentences.every((sentence) => fixture.allowedFacts.includes(sentence))).toBe(true);
    for (const sentence of preservedSentences) {
      expect(fixture.prohibitedConclusions.some((conclusion) => sentence.includes(conclusion))).toBe(false);
    }
  }
});

it('references only existing movements and retains expected evidence outside the first page', () => {
  for (const fixture of processAiSummaryFixtures) {
    const existingRefs = fixture.movements.map((_, index) => `m${index + 1}`);
    const responseRefs = fixture.preservedResponse.flatMap(({ sourceRefs }) => sourceRefs);

    expect(responseRefs.every((ref) => existingRefs.includes(ref))).toBe(true);
    expect(fixture.expectedEvidence.every((ref) => responseRefs.includes(ref))).toBe(true);
  }
  expect(processAiSummaryFixtures[2]?.expectedEvidence).toContain('m3');
});

it('preserves a passing rubric result for each synthetic regression response', () => {
  const rubricKeys = [
    'factuality',
    'evidenceSupport',
    'relevantCoverage',
    'uncertainty',
    'noAdvice',
    'simpleBrazilianPortuguese',
  ] as const;

  for (const fixture of processAiSummaryFixtures) {
    expect(fixture.rubric).toEqual(Object.fromEntries(rubricKeys.map((key) => [key, true])));
  }
});
