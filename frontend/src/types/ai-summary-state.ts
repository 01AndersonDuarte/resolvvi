import type { AiSummary } from './ai-summary';
import type { SummaryAttempt } from './summary-attempt';

export type AiSummaryState = {
  processId: number;
  status: 'available' | 'not_generated' | 'generating' | 'stale' | 'no_movements' | 'insufficient_data' | 'context_exceeded' | 'failed';
  summary: AiSummary | null;
  attempt: SummaryAttempt | null;
  message: string | null;
  failureCode: string | null;
  action: 'generate' | 'update' | 'retry' | 'none';
  serverTime: string;
};
