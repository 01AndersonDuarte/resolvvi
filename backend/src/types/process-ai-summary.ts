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
  source?: PreparedSummarySource;
};

export type SummaryFeedback = {
  helpful: boolean;
  createdAt: string;
  updatedAt: string;
};
export type AiSummary = {
  id: string;
  version: number;
  paragraphs: string[];
  generatedAt: string;
  movementCount: number;
  references: SummaryReference[];
  myFeedback: SummaryFeedback | null;
};
export type SummaryAttemptView = {
  id: string;
  startedAt: string;
  deadlineAt: string;
  retryAt: string | null;
};
export type AiSummaryState = {
  processId: number;
  status: 'available' | 'not_generated' | 'generating' | 'stale' | 'no_movements' | 'insufficient_data' | 'context_exceeded' | 'failed';
  summary: AiSummary | null;
  attempt: SummaryAttemptView | null;
  message: string | null;
  failureCode: string | null;
  action: 'generate' | 'update' | 'retry' | 'none';
  serverTime: string;
};
export type SummaryReadInput = { processId: number; userId: string; attemptId?: string; track?: boolean; requestId?: string | undefined };
export type SummaryFeedbackCommand = { processId: number; summaryId: string; userId: string; helpful: boolean; requestId?: string | undefined };
export type ProcessAiSummaryServiceContract = {
  read: (input: SummaryReadInput) => Promise<AiSummaryState>;
  requestGeneration: (input: SummaryReadInput & { sessionId: string }) => Promise<AiSummaryState>;
  saveFeedback: (input: SummaryFeedbackCommand) => Promise<{
    outcome: 'created' | 'updated' | 'unchanged';
    feedback: SummaryFeedback;
  }>;
};
