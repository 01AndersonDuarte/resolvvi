import type { SummaryFeedback } from './summary-feedback';
import type { SummaryReference } from './summary-reference';

export type AiSummary = {
  id: string;
  version: number;
  paragraphs: string[];
  generatedAt: string;
  movementCount: number;
  references: SummaryReference[];
  myFeedback: SummaryFeedback | null;
};
