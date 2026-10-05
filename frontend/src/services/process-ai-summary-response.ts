import type { AiSummary } from '../types/ai-summary';
import type { AiSummaryState } from '../types/ai-summary-state';
import type { SummaryAttempt } from '../types/summary-attempt';
import type { SummaryFeedback } from '../types/summary-feedback';
import type { SummaryReference } from '../types/summary-reference';

const SUMMARY_STATUSES = ['available', 'not_generated', 'generating', 'stale', 'no_movements', 'insufficient_data', 'context_exceeded', 'failed'] as const;
const SUMMARY_ACTIONS = ['generate', 'update', 'retry', 'none'] as const;

export function readAiSummaryState(value: unknown, expectedProcessId: number): AiSummaryState {
  if (!isRecord(value) || value.processId !== expectedProcessId || !isOneOf(value.status, SUMMARY_STATUSES) ||
    !isNullableRecord(value.summary) || !isNullableRecord(value.attempt) ||
    !isNullableString(value.message) || !isNullableString(value.failureCode) || !isOneOf(value.action, SUMMARY_ACTIONS) ||
    !isDateTime(value.serverTime)) throw new Error('Resposta do resumo processual inválida.');

  const summary = value.summary === null ? null : readSummary(value.summary);
  const attempt = value.attempt === null ? null : readAttempt(value.attempt);
  if ((value.status === 'available') !== (summary !== null) || (value.status === 'generating' && attempt === null)) {
    throw new Error('Resposta do resumo processual inválida.');
  }
  return { processId: expectedProcessId, status: value.status, summary, attempt, message: value.message,
    failureCode: value.failureCode, action: value.action, serverTime: value.serverTime };
}

function readSummary(value: Record<string, unknown>): AiSummary {
  if (!isUuid(value.id) || !isPositiveInteger(value.version) || !isDateTime(value.generatedAt) ||
    !isPositiveOrZeroInteger(value.movementCount) || !Array.isArray(value.paragraphs) || value.paragraphs.length < 1 ||
    value.paragraphs.length > 3 || !value.paragraphs.every(isNonEmptyString) || !Array.isArray(value.references) ||
    !value.references.every(isReference) || !(value.myFeedback === null || isFeedback(value.myFeedback))) {
    throw new Error('Resposta do resumo processual inválida.');
  }
  return { id: value.id, version: value.version, generatedAt: value.generatedAt, movementCount: value.movementCount,
    paragraphs: value.paragraphs, references: value.references, myFeedback: value.myFeedback };
}

function readAttempt(value: Record<string, unknown>): SummaryAttempt {
  if (!isUuid(value.id) || !isDateTime(value.startedAt) || !isDateTime(value.deadlineAt) ||
    !(value.retryAt === null || isDateTime(value.retryAt))) throw new Error('Resposta de tentativa inválida.');
  return { id: value.id, startedAt: value.startedAt, deadlineAt: value.deadlineAt, retryAt: value.retryAt };
}

function isReference(value: unknown): value is SummaryReference {
  return isRecord(value) && isPositiveInteger(value.movementId) && isNonEmptyString(value.date) &&
    typeof value.title === 'string' && isPositiveOrZeroInteger(value.paragraphIndex) &&
    isPositiveOrZeroInteger(value.sentenceIndex) && isNonEmptyString(value.sentenceText);
}

function isFeedback(value: unknown): value is SummaryFeedback {
  return isRecord(value) && typeof value.helpful === 'boolean' && isDateTime(value.createdAt) && isDateTime(value.updatedAt);
}

function isDateTime(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isOneOf<TValues extends readonly string[]>(value: unknown, values: TValues): value is TValues[number] {
  return typeof value === 'string' && values.includes(value);
}

function isNullableRecord(value: unknown): value is Record<string, unknown> | null {
  return value === null || isRecord(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value > 0;
}

function isPositiveOrZeroInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value >= 0;
}
