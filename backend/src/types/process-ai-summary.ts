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

export type SummarySourceSnapshot = {
  source: PreparedSummarySource;
  sourceRevision: number;
  lastSummaryVersion: number;
};

export type SummaryReservationInput = {
  processId: number;
  rulesVersion: string;
  configuration: Record<string, unknown>;
  configurationHash: string;
  now: Date;
  deadlineAt: Date;
  retryAt: Date;
};

export type SummaryReservation = {
  outcome: 'created' | 'joined' | 'reused' | 'cooldown' | 'source_changed';
  slotId: string | null;
  attemptId: string | null;
  attemptNumber: number | null;
  deadlineAt: Date | null;
  retryAt: Date | null;
};
