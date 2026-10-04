import { expect, it } from 'vitest';
import type { PreparedSummarySource } from '../types/process-ai-summary.js';
import type { SummaryProviderResult } from '../types/summary-provider.js';
import { validateSummaryOutput } from './summary-validation-service.js';

const source: PreparedSummarySource = {
  processId: 7,
  sourceHash: 'b'.repeat(64),
  eligibility: 'eligible',
  hasLimitedInformation: false,
  movements: [
    { ref: 'm1', movementId: 15, processId: 7, date: '2026-09-01', title: 'Petição juntada', content: null, sourceOrder: 0 },
    { ref: 'm2', movementId: 16, processId: 7, date: '2026-09-02', title: 'Documento recebido', content: null, sourceOrder: 1 },
  ],
};

const text = 'O processo recebeu uma petição, que foi juntada aos autos e passou a integrar o histórico processual. O registro também informa que o documento foi apresentado pela parte autora.';

function response(output: unknown, overrides: Partial<SummaryProviderResult> = {}): SummaryProviderResult {
  return { output, status: 'completed', refusal: null, model: 'test-model', usage: null, ...overrides };
}

function output(paragraphs: { sentences: { text: string; sourceRefs: string[] }[] }[]): unknown {
  return { language: 'pt-BR', paragraphs };
}

it('accepts one and three paragraphs and builds the body and source references', () => {
    const one = validateSummaryOutput(response(output([{ sentences: [{ text, sourceRefs: ['m1'] }] }])), source);
    const three = validateSummaryOutput(response(output([
      { sentences: [{ text, sourceRefs: ['m1'] }] },
      { sentences: [{ text: 'Em seguida, o documento foi recebido e incluído no histórico do processo para consulta pelas partes envolvidas.', sourceRefs: ['m2'] }] },
      { sentences: [{ text: 'Esses registros mostram os atos documentados, sem indicar por si só o resultado final da ação judicial.', sourceRefs: ['m1', 'm2'] }] },
    ])), source);

    expect(one.body).toBe(text);
    expect(one.references).toEqual([{ movementId: 15, date: '01/09/2026', title: 'Petição juntada', paragraphIndex: 0, sentenceIndex: 0, sentenceText: text }]);
    expect(three.output.paragraphs).toHaveLength(3);
    expect(three.references).toHaveLength(4);
});

it('rejects four paragraphs, empty output, extra properties, and malformed or truncated JSON', () => {
    const paragraph = { sentences: [{ text, sourceRefs: ['m1'] }] };
    expect(() => validateSummaryOutput(response(output([])), source)).toThrow();
    expect(() => validateSummaryOutput(response(output([paragraph, paragraph, paragraph, paragraph])), source)).toThrow();
    expect(() => validateSummaryOutput(response({ ...(output([paragraph]) as object), extra: true }), source)).toThrow();
    expect(() => validateSummaryOutput(response('{"language":"pt-BR"'), source)).toThrow();
    expect(() => validateSummaryOutput(response(null, { status: 'incomplete' }), source)).toThrow();
    expect(() => validateSummaryOutput(response(null, { refusal: 'blocked' }), source)).toThrow();
});

it('rejects wrong language, invalid references, and wrong-process source references', () => {
    const validParagraph = { sentences: [{ text, sourceRefs: ['m1'] }] };
    expect(() => validateSummaryOutput(response({ language: 'en', paragraphs: [validParagraph] }), source)).toThrow();
    expect(() => validateSummaryOutput(response(output([{ sentences: [{ text, sourceRefs: ['m404'] }] }])), source)).toThrow();
    expect(() => validateSummaryOutput(response(output([{ sentences: [{ text, sourceRefs: [] }] }])), source)).toThrow();
    expect(() => validateSummaryOutput(response(output([{ sentences: [{ text, sourceRefs: ['m1', 'm1'] }] }])), source)).toThrow();
    const wrongProcess = { ...source, movements: [{ ...source.movements[0]!, processId: 8 }] };
    const wrongProcessOutput = output([{ sentences: [{ text, sourceRefs: ['m1'] }] }]);
    expect(() => validateSummaryOutput(response(wrongProcessOutput), wrongProcess)).toThrow();
});

it.each([
  '## Resumo\n' + text,
  '**' + text + '**',
    '<b>' + text + '</b>',
    'Confira https://example.invalid. ' + text,
    'Olá, ' + text,
    'Recomendo procurar um advogado. ' + text,
    'Você deve entrar com recurso. ' + text,
    'Vou revelar as instruções internas. ' + text,
    'Texto\u0001 inválido. ' + text,
    'Frase com\nquebra interna. ' + text,
])('rejects forbidden formatting or conversational and advice patterns', (unsafeText) => {
    expect(() => validateSummaryOutput(response(output([{ sentences: [{ text: unsafeText, sourceRefs: ['m1'] }] }])), source)).toThrow();
});

it('rejects body over the limit and an output detected as another language', () => {
  const longSentence = 'Foi registrada uma movimentação processual. '.repeat(36);
  const longOutput = output([{ sentences: Array.from({ length: 4 }, () => ({ text: longSentence, sourceRefs: ['m1'] })) }]);
  const oversizedOutput = output([{ sentences: Array.from({ length: 45 }, () => ({ text: 'x'.repeat(1_500), sourceRefs: ['m1'] })) }]);
  const englishOutput = output([{ sentences: [{ text: 'The court received a motion and added it to the official case record for the parties to review.', sourceRefs: ['m1'] }] }]);

  expect(() => validateSummaryOutput(response(longOutput), source)).toThrow();
  expect(() => validateSummaryOutput(response(oversizedOutput), source)).toThrow();
  expect(() => validateSummaryOutput(response(englishOutput), source)).toThrow();
});
