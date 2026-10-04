import { expect, it } from 'vitest';
import { ProcessAiSummaryError } from '../errors/process-ai-summary-errors.js';
import type { Movement } from '../generated/prisma/client.js';
import { assertSummaryFitsCapacity, estimateSummaryCapacity, prepareSummarySource } from './summary-source-service.js';

type TestMovementInput = Pick<Movement, 'id' | 'processId' | 'movementDate' | 'sourceOrder'>
  & Partial<Pick<Movement, 'movementTitle' | 'movementContent'>>;

function movement(input: TestMovementInput): Movement {
  return { movementTitle: '', movementContent: null, ...input };
}

it('includes every source field and all records with stable tie-breaking', async () => {
  const records = [
    movement({ id: 2, processId: 9, movementDate: new Date('2026-02-01T00:00:00Z'), movementTitle: 'Segundo', sourceOrder: 1 }),
    movement({ id: 3, processId: 9, movementDate: new Date('2026-01-01T00:00:00Z'), movementTitle: 'Empate B', sourceOrder: 2 }),
    movement({ id: 1, processId: 9, movementDate: new Date('2026-01-01T00:00:00Z'), movementTitle: 'Empate A', sourceOrder: 2 }),
  ];
  const first = await prepareSummarySource(9, records);
  const second = await prepareSummarySource(9, [...records].reverse());
  const changed = movement({ id: 2, processId: 9, movementDate: new Date('2026-02-01T00:00:00Z'), movementTitle: 'Segundo', movementContent: 'texto diferente', sourceOrder: 1 });

  expect(first.movements.map(({ movementId, date, title, sourceOrder }) => ({ movementId, date, title, sourceOrder }))).toEqual([
    { movementId: 1, date: '2026-01-01', title: 'Empate A', sourceOrder: 2 },
    { movementId: 3, date: '2026-01-01', title: 'Empate B', sourceOrder: 2 },
    { movementId: 2, date: '2026-02-01', title: 'Segundo', sourceOrder: 1 },
  ]);
  expect(first.movements.map(({ ref }) => ref)).toEqual(['m1', 'm2', 'm3']);
  expect(first.sourceHash).toBe(second.sourceHash);
  expect(first.sourceHash).toMatch(/^[a-f\d]{64}$/u);
  expect(await prepareSummarySource(9, [changed])).not.toMatchObject({ sourceHash: first.sourceHash });
});

it('changes the source hash when any identity, date, text, linkage, or order field changes', async () => {
  const base = movement({ id: 1, processId: 9, movementDate: new Date('2026-01-01Z'), movementTitle: 'Original', movementContent: 'Texto original', sourceOrder: 0 });
  const baseline = await prepareSummarySource(9, [base]);
  const variants = [
    { processId: 9, movement: movement({ ...base, id: 2 }) },
    { processId: 10, movement: movement({ ...base, processId: 10 }) },
    { processId: 9, movement: movement({ ...base, movementDate: new Date('2026-01-02Z') }) },
    { processId: 9, movement: movement({ ...base, movementTitle: 'Título diferente' }) },
    { processId: 9, movement: movement({ ...base, movementContent: null }) },
    { processId: 9, movement: movement({ ...base, sourceOrder: 1 }) },
  ];

  for (const variant of variants) {
    const prepared = await prepareSummarySource(variant.processId, [variant.movement]);
    expect(prepared.sourceHash).not.toBe(baseline.sourceHash);
  }
});

it('distinguishes no movements, unusable placeholders, and one informative title', async () => {
  const empty = await prepareSummarySource(9, []);
  const placeholders = await prepareSummarySource(9, [movement({ id: 1, processId: 9, movementDate: new Date('2026-01-01Z'), movementTitle: ' - ', sourceOrder: 0 })]);
  const titled = await prepareSummarySource(9, [movement({ id: 2, processId: 9, movementDate: new Date('2026-01-01Z'), movementTitle: 'Sentença registrada', sourceOrder: 0 })]);

  expect(empty.eligibility).toBe('no_movements');
  expect(placeholders.eligibility).toBe('no_usable_text');
  expect(titled).toMatchObject({ eligibility: 'eligible', hasLimitedInformation: true });
});

it('yields between batches and stops when source preparation exceeds its budget', async () => {
  let time = 0;
  const now = (): number => (time += 2);
  const records = [0, 1, 2].map((id) => movement({ id: id + 1, processId: 9, movementDate: new Date('2026-01-01Z'), sourceOrder: id }));

  await expect(prepareSummarySource(9, records, { batchSize: 1, budgetMs: 1, now })).rejects.toMatchObject<Partial<ProcessAiSummaryError>>({ code: 'SUMMARY_SOURCE_PREPARATION_TIMEOUT' });
});

it('rejects mismatched and malformed source records', async () => {
  const wrongProcess = movement({ id: 1, processId: 8, movementDate: new Date('2026-01-01Z'), sourceOrder: 0 });
  await expect(prepareSummarySource(9, [wrongProcess])).rejects.toMatchObject({ code: 'SUMMARY_SOURCE_INVALID' });
  await expect(prepareSummarySource(0, [])).rejects.toMatchObject({ code: 'SUMMARY_SOURCE_INVALID' });
});

it('counts instructions, schema, source and reservations at the capacity boundary', async () => {
  const source = await prepareSummarySource(9, []);
  const small = { movements: source.movements, instructions: 'rules', schema: { type: 'object' } };
  const base = estimateSummaryCapacity(small);

  expect(base.estimatedUnits).toBeGreaterThan(Buffer.byteLength('rules{"type":"object"}', 'utf8'));
  expect(estimateSummaryCapacity({ ...small, capacity: base.estimatedUnits }).fits).toBe(true);
  const excess = estimateSummaryCapacity({ ...small, capacity: base.estimatedUnits - 1 });
  expect(excess.fits).toBe(false);
  expect(() => assertSummaryFitsCapacity(excess)).toThrow('context limit');
  const longRecord = await prepareSummarySource(9, [movement({ id: 1, processId: 9, movementDate: new Date('2026-01-01Z'), movementTitle: 'x'.repeat(1_000), sourceOrder: 0 })]);
  expect(estimateSummaryCapacity({ ...small, movements: longRecord.movements, capacity: base.estimatedUnits }).fits).toBe(false);
});
