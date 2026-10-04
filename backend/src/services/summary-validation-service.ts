import { franc } from 'franc-min';
import { summaryOutputInvalid, summaryOutputLanguageInvalid } from '../errors/process-ai-summary-errors.js';
import { providerSummaryOutputSchema } from '../schemas/process-ai-summary-schema.js';
import type { PreparedSummarySource, SourceMovement, SummaryReference } from '../types/process-ai-summary.js';
import type { SummaryProviderResult, ValidatedSummary } from '../types/summary-provider.js';
import { containsDisallowedSummaryText, hasInternalLineBreak } from './summary-output-policy.js';

const MAX_PROVIDER_RESPONSE_BYTES = 65_536;
const MAX_SUMMARY_BODY_LENGTH = 6_000;

function parseOutput(output: unknown): unknown {
  if (typeof output !== 'string') return output;
  try {
    return JSON.parse(output) as unknown;
  } catch {
    throw summaryOutputInvalid();
  }
}

function assertTransportCompleted(result: SummaryProviderResult): void {
  if (result.status !== 'completed' || result.refusal !== null) throw summaryOutputInvalid();
}

function serializeOutput(output: unknown): string {
  try {
    const serialized = JSON.stringify(output);
    if (serialized === undefined) throw summaryOutputInvalid();
    if (Buffer.byteLength(serialized, 'utf8') > MAX_PROVIDER_RESPONSE_BYTES) throw summaryOutputInvalid();
    return serialized;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ProcessAiSummaryError') throw error;
    throw summaryOutputInvalid();
  }
}

function flattenTexts(paragraphs: { sentences: { text: string; sourceRefs: string[] }[] }[]): string[] {
  return paragraphs.flatMap((paragraph) => paragraph.sentences.map((sentence) => sentence.text));
}

function buildBody(paragraphs: { sentences: { text: string; sourceRefs: string[] }[] }[]): string {
  return paragraphs.map((paragraph) => paragraph.sentences.map((sentence) => sentence.text).join(' ')).join('\n\n');
}

function isSentenceInvalid(text: string): boolean {
  return text.trim().length === 0 || hasInternalLineBreak(text) || containsDisallowedSummaryText(text);
}

function assertOutputPolicy(body: string, texts: string[]): void {
  if (body.length > MAX_SUMMARY_BODY_LENGTH || texts.some(isSentenceInvalid)) throw summaryOutputInvalid();
  if (franc(body) !== 'por') throw summaryOutputLanguageInvalid();
}

function getMovementReference(ref: string, source: PreparedSummarySource): SourceMovement {
  const movement = source.movements.find((item) => item.ref === ref);
  if (movement?.processId !== source.processId) throw summaryOutputInvalid();
  return movement;
}

function formatCivilDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

function buildReferences(
  output: { paragraphs: { sentences: { text: string; sourceRefs: string[] }[] }[] },
  source: PreparedSummarySource,
): SummaryReference[] {
  return output.paragraphs.flatMap((paragraph, paragraphIndex) => paragraph.sentences.flatMap((sentence, sentenceIndex) =>
    sentence.sourceRefs.map((ref) => {
      const movement = getMovementReference(ref, source);
      return { movementId: movement.movementId, date: formatCivilDate(movement.date), title: movement.title, paragraphIndex, sentenceIndex, sentenceText: sentence.text };
    }),
  ));
}

export function validateSummaryOutput(result: SummaryProviderResult, source: PreparedSummarySource): ValidatedSummary {
  assertTransportCompleted(result);
  const parsed = parseOutput(result.output);
  serializeOutput(parsed);
  const validation = providerSummaryOutputSchema.validate(parsed, { abortEarly: true, convert: false });
  if (validation.error) throw summaryOutputInvalid();

  const output = validation.value;
  const texts = flattenTexts(output.paragraphs);
  const body = buildBody(output.paragraphs);
  assertOutputPolicy(body, texts);
  const references = buildReferences(output, source);
  return { output, body, references };
}
