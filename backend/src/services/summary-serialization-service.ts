import type { ProcessAiSummary, SummaryFeedbackRecord } from '../generated/prisma/client.js';
import { providerSummaryOutputSchema } from '../schemas/process-ai-summary-schema.js';
import type { PreparedSummarySource, AiSummary, SourceMovement, SummaryReference } from '../types/process-ai-summary.js';

type SummaryWithFeedback = ProcessAiSummary & { myFeedback: SummaryFeedbackRecord | null };

function parseParagraphs(value: unknown): string[] {
  const result = Array.isArray(value) && value.every((item: unknown) => typeof item === 'string' && item.trim().length > 0)
    ? value as string[]
    : null;
  if (!result || result.length < 1 || result.length > 3) throw new Error('Persisted summary paragraphs are invalid.');
  return result;
}

function parseClaims(value: unknown): { sentences: { text: string; sourceRefs: string[] }[] }[] {
  const validation = providerSummaryOutputSchema.validate({ language: 'pt-BR', paragraphs: value }, { convert: false });
  if (validation.error) throw new Error('Persisted summary claims are invalid.');
  return validation.value.paragraphs;
}

function findMovement(ref: string, source: PreparedSummarySource): SourceMovement {
  const movement = source.movements.find((item) => item.ref === ref);
  if (!movement) throw new Error('Persisted summary reference is invalid.');
  return movement;
}

function movementReference(input: {
  ref: string;
  sentenceText: string;
  paragraphIndex: number;
  sentenceIndex: number;
  source: PreparedSummarySource;
}): SummaryReference {
  const movement = findMovement(input.ref, input.source);
  const [year, month, day] = movement.date.split('-');
  return {
    movementId: movement.movementId,
    date: `${day}/${month}/${year}`,
    title: movement.title,
    paragraphIndex: input.paragraphIndex,
    sentenceIndex: input.sentenceIndex,
    sentenceText: input.sentenceText,
  };
}

function serializeReferences(
  claims: { sentences: { text: string; sourceRefs: string[] }[] }[],
  source: PreparedSummarySource,
): SummaryReference[] {
  return claims.flatMap((paragraph, paragraphIndex) => paragraph.sentences.flatMap((sentence, sentenceIndex) =>
    sentence.sourceRefs.map((ref) => movementReference({
      ref, sentenceText: sentence.text, paragraphIndex, sentenceIndex, source,
    })),
  ));
}

function serializeFeedback(feedback: SummaryFeedbackRecord | null): AiSummary['myFeedback'] {
  if (!feedback) return null;
  return {
    helpful: feedback.helpful,
    createdAt: feedback.createdAt.toISOString(),
    updatedAt: feedback.updatedAt.toISOString(),
  };
}

export function serializeProcessAiSummary(
  summary: SummaryWithFeedback,
  source: PreparedSummarySource,
): AiSummary {
  const claims = parseClaims(summary.claims);
  return {
    id: summary.id,
    version: summary.version,
    paragraphs: parseParagraphs(summary.paragraphs),
    generatedAt: summary.generatedAt.toISOString(),
    movementCount: source.movements.length,
    references: serializeReferences(claims, source),
    myFeedback: serializeFeedback(summary.myFeedback),
  };
}
