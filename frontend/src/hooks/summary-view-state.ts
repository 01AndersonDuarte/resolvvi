import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AiSummaryState } from '../types/ai-summary-state';
import type { SummaryFeedback } from '../types/summary-feedback';

export type SummaryViewState = {
  data: AiSummaryState | null;
  loading: boolean;
  generating: boolean;
  error: string | null;
};

export type SummaryRequest = {
  controller: AbortController;
  timeout: number;
  hasTimedOut: () => boolean;
};

export type SummaryReadState = (attemptId?: string) => Promise<AiSummaryState | null>;
export type SummaryStateUpdater = Dispatch<SetStateAction<SummaryViewState>>;

export type SummaryRequestRuntime = {
  identity: MutableRefObject<number>;
  controllers: MutableRefObject<Set<AbortController>>;
  startRequest: () => SummaryRequest;
  finishRequest: (request: SummaryRequest) => void;
};

export type SummaryStateActions = {
  applyState: (data: AiSummaryState) => void;
  handleFailure: (error: unknown) => void;
  updateSummary: (summaryId: string, feedback: SummaryFeedback) => void;
};
