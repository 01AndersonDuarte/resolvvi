import type { SummaryFeedback } from '../types/summary-feedback';

export type SummaryFeedbackResult = { outcome: 'created' | 'updated' | 'unchanged'; feedback: SummaryFeedback };

export function readSummaryFeedbackResult(value: unknown): SummaryFeedbackResult {
  if (!isRecord(value) || !['created', 'updated', 'unchanged'].includes(String(value.outcome)) ||
    !isFeedback(value.feedback)) throw new Error('Resposta da avaliação inválida.');
  return { outcome: value.outcome as SummaryFeedbackResult['outcome'], feedback: value.feedback };
}

function isFeedback(value: unknown): value is SummaryFeedback {
  return isRecord(value) && typeof value.helpful === 'boolean' && isValidDate(value.createdAt) && isValidDate(value.updatedAt);
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
