import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { prepareSummarySource } from '../../summary-source-service.js';
import { validateSummaryOutput } from '../../summary-validation-service.js';

type EvaluatedCase = {
  id: string;
  movements: { date: string; title: string; content: string | null; sourceOrder: number }[];
  output: { paragraphs: { sentences: { text: string; sourceRefs: string[] }[] }[] };
};

const sample = JSON.parse(readFileSync(new URL('./evaluated-responses.json', import.meta.url), 'utf8')) as {
  model: string; rulesVersion: string; cases: EvaluatedCase[];
};

it.each(sample.cases)('accepts the reviewed real response and its source references: $id', async (item) => {
  const source = await prepareSummarySource(1, item.movements.map((movement, index) => ({
    id: index + 1, processId: 1, movementDate: new Date(`${movement.date}T00:00:00Z`),
    movementTitle: movement.title, movementContent: movement.content, sourceOrder: movement.sourceOrder,
  })));
  const result = validateSummaryOutput({
    output: item.output, status: 'completed', refusal: null, model: sample.model, usage: null,
  }, source);

  expect(result.body.length).toBeGreaterThan(0);
  expect(result.output.paragraphs.length).toBeGreaterThanOrEqual(1);
  expect(result.output.paragraphs.length).toBeLessThanOrEqual(3);
  for (const reference of result.references) {
    expect(source.movements.some((movement) => movement.movementId === reference.movementId)).toBe(true);
  }
});

function bodyFor(id: string): string {
  const item = sample.cases.find((entry) => entry.id.startsWith(id));
  if (!item) throw new Error(`Missing reviewed case ${id}`);
  return item.output.paragraphs.flatMap((paragraph) => paragraph.sentences.map(({ text }) => text)).join(' ');
}

it('preserves uncertainty and exact procedural meaning in the reviewed regression sample', () => {
  expect(sample.cases).toHaveLength(20);
  expect(bodyFor('S02')).toContain('contraditórios');
  expect(bodyFor('S02')).not.toMatch(/pedidos diferentes|ao mesmo tempo/);
  expect(bodyFor('S07')).toContain('não informam o desfecho');
  expect(bodyFor('S09')).toContain('não informam se esses documentos foram apresentados');
  expect(bodyFor('S10')).toContain('não consta nos registros');
  expect(bodyFor('S10')).not.toContain('não foi apresentado');
  expect(bodyFor('S16')).toContain('impugnação, que é um questionamento formal');
  expect(bodyFor('S16')).not.toMatch(/contestação|impugnação.{0,40}(?:valor|cálculo|pedido)/);
  expect(bodyFor('S18')).not.toContain('sem julgamento do mérito');
});
