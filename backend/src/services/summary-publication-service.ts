import type { SummaryGenerationDependencies, SummaryGenerationJob } from './summary-generation-types.js';
import type { SummaryProviderResult, ValidatedSummary } from '../types/summary-provider.js';

export function createSummaryPublication(input: {
  job: SummaryGenerationJob;
  validated: ValidatedSummary;
  providerResult: SummaryProviderResult;
  now: Date;
  deadlineAt: Date;
}): Parameters<SummaryGenerationDependencies['publish']>[0] {
  const { job, validated, providerResult, now, deadlineAt } = input;
  return {
    processId: job.processId,
    slotId: job.slotId,
    attemptId: job.attemptId,
    rulesVersion: job.rulesVersion,
    paragraphs: validated.output.paragraphs.map((paragraph) => paragraph.sentences.map((sentence) => sentence.text).join(' ')),
    claims: validated.output.paragraphs,
    now,
    deadlineAt,
    usage: providerResult.usage,
    providerRequestId: providerResult.providerRequestId ?? null,
  };
}
