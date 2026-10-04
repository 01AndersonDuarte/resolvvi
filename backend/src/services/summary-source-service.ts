import { createHash } from 'node:crypto';
import { setImmediate as yieldToEventLoop } from 'node:timers/promises';
import type { Movement } from '../generated/prisma/client.js';
import { summaryPreparationTimeout, summarySourceInvalid, summarySourceTooLarge } from '../errors/process-ai-summary-errors.js';
import { sourceMovementsSchema } from '../schemas/process-ai-summary-schema.js';
import type { PreparedSummarySource, SourceMovement, SummaryCapacity } from '../types/process-ai-summary.js';

const DEFAULT_CAPACITY = 131_072;
const OUTPUT_RESERVE = 4_096;
const PROTOCOL_RESERVE = 4_096;
const BATCH_SIZE = 100;
const PREPARATION_BUDGET_MS = 2_000;
const PLACEHOLDER_PATTERN = /^(?:[-–—.]+|n\/?a|não informado|sem informação|indisponível|undefined|null)$/i;

type MovementInput = Pick<Movement, 'id' | 'processId' | 'movementDate' | 'movementTitle' | 'movementContent' | 'sourceOrder'>;
type PrepareSourceOptions = { batchSize?: number; budgetMs?: number; now?: () => number };

function civilDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function compareMovements(first: MovementInput, second: MovementInput): number {
  return civilDate(first.movementDate).localeCompare(civilDate(second.movementDate))
    || first.sourceOrder - second.sourceOrder
    || first.id - second.id;
}

function mapMovement(movement: MovementInput, index: number): SourceMovement {
  return {
    ref: `m${index + 1}`,
    movementId: movement.id,
    processId: movement.processId,
    date: civilDate(movement.movementDate),
    title: movement.movementTitle,
    content: movement.movementContent,
    sourceOrder: movement.sourceOrder,
  };
}

function hasUsableText(movement: SourceMovement): boolean {
  const values = [movement.title, movement.content ?? ''];
  return values.some((value) => value.trim().length > 0 && !PLACEHOLDER_PATTERN.test(value.trim()));
}

function getEligibility(movements: SourceMovement[]): PreparedSummarySource['eligibility'] {
  if (movements.length === 0) return 'no_movements';
  return movements.some(hasUsableText) ? 'eligible' : 'no_usable_text';
}

function hashSource(processId: number, movements: SourceMovement[]): string {
  return createHash('sha256').update(JSON.stringify({ processId, movements })).digest('hex');
}

export async function prepareSummarySource(
  processId: number,
  input: MovementInput[],
  options: PrepareSourceOptions = {},
): Promise<PreparedSummarySource> {
  const startedAt = (options.now ?? Date.now)();
  const batchSize = options.batchSize ?? BATCH_SIZE;
  const budgetMs = options.budgetMs ?? PREPARATION_BUDGET_MS;
  if (!Number.isSafeInteger(processId) || processId < 1 || batchSize < 1 || budgetMs < 1) throw summarySourceInvalid();

  const sorted = [...input].sort(compareMovements);
  const movements: SourceMovement[] = [];
  for (let start = 0; start < sorted.length; start += batchSize) {
    const batch = sorted.slice(start, start + batchSize).map((movement, index) => mapMovement(movement, start + index));
    if (batch.some((movement) => movement.processId !== processId)) throw summarySourceInvalid();
    movements.push(...batch);
    if ((options.now ?? Date.now)() - startedAt > budgetMs) throw summaryPreparationTimeout();
    if (start + batchSize < sorted.length) await yieldToEventLoop();
  }
  const validation = sourceMovementsSchema.validate(movements);
  if (validation.error) throw summarySourceInvalid();

  return {
    processId,
    movements,
    sourceHash: hashSource(processId, movements),
    eligibility: getEligibility(movements),
    hasLimitedInformation: movements.filter(hasUsableText).length < 2,
  };
}

export function estimateSummaryCapacity(input: {
  movements: SourceMovement[];
  instructions: string;
  schema: Record<string, unknown>;
  capacity?: number;
}): SummaryCapacity {
  const records = input.movements.map(({ ref, date, title, content, sourceOrder }) => ({ ref, date, title, content, sourceOrder }));
  const payload = JSON.stringify({ records });
  const estimatedUnits = Buffer.byteLength(payload + input.instructions + JSON.stringify(input.schema), 'utf8')
    + OUTPUT_RESERVE + PROTOCOL_RESERVE;
  const capacity = input.capacity ?? DEFAULT_CAPACITY;
  return { estimatedUnits, capacity, fits: estimatedUnits <= capacity, estimatorVersion: 'utf8-upper-bound-v1' };
}

export function assertSummaryFitsCapacity(capacity: SummaryCapacity): void {
  if (!capacity.fits) throw summarySourceTooLarge();
}
