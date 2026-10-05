import type { PreparedSummarySource } from '../types/process-ai-summary.js';
import type { SummaryProvider, SummaryProviderInput, SummaryProviderResult, ValidatedSummary } from '../types/summary-provider.js';
import type { SummaryOperationalEvent } from './summary-operational-event-service.js';

export type SummaryGenerationJob = {
  processId: number;
  slotId: string;
  attemptId: string;
  sessionId: string;
  rulesVersion: string;
  source: PreparedSummarySource;
  requestedAt: number;
  startedAt: Date;
};

export type SummaryAttemptFailure = {
  attemptId: string;
  failureCode: string;
  retryAt: Date | null;
  now: Date;
  usage?: SummaryProviderResult['usage'];
  providerRequestId?: string | null;
};

export type SummaryGenerationDependencies = {
  provider: SummaryProvider | null;
  validateSession: (sessionId: string) => Promise<void>;
  markDispatched: (attemptId: string, now: Date) => Promise<boolean>;
  validateOutput: (result: SummaryProviderResult, source: PreparedSummarySource) => ValidatedSummary;
  publish: (input: {
    processId: number;
    slotId: string;
    attemptId: string;
    rulesVersion: string;
    paragraphs: string[];
    claims: ValidatedSummary['output']['paragraphs'];
    now: Date;
    deadlineAt: Date;
    usage: SummaryProviderResult['usage'];
    providerRequestId: string | null;
  }) => Promise<boolean>;
  finish: (input: SummaryAttemptFailure) => Promise<void>;
  createProviderInput: (source: PreparedSummarySource, signal: AbortSignal) => SummaryProviderInput;
  now?: () => Date;
  monotonicNow?: () => number;
  onEvent?: (event: SummaryOperationalEvent) => void;
};

export type SummaryGenerationService = {
  acquire: () => (() => void) | null;
  start: (job: SummaryGenerationJob, release?: () => void) => boolean;
  shutdown: () => Promise<void>;
};
