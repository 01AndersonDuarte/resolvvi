export type SourceMovement = {
  ref: string;
  movementId: number;
  processId: number;
  date: string;
  title: string;
  content: string | null;
  sourceOrder: number;
};

export type SummarySentence = { text: string; sourceRefs: string[] };
export type SummaryParagraph = { sentences: SummarySentence[] };
export type ProviderSummaryOutput = {
  language: 'pt-BR';
  paragraphs: SummaryParagraph[];
};
export type SummaryReference = {
  movementId: number;
  date: string;
  title: string;
  paragraphIndex: number;
  sentenceIndex: number;
  sentenceText: string;
};
export type PreparedSummarySource = {
  processId: number;
  movements: SourceMovement[];
  sourceHash: string;
  eligibility: 'eligible' | 'no_movements' | 'no_usable_text';
  hasLimitedInformation: boolean;
};
export type SummaryCapacity = {
  estimatedUnits: number;
  capacity: number;
  fits: boolean;
  estimatorVersion: 'utf8-upper-bound-v1';
};
