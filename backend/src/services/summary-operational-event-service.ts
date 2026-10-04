import { logger, type Logger } from '../config/logger.js';

export type SummaryOperationalEventName =
  | 'summary_requested'
  | 'summary_reused'
  | 'summary_joined'
  | 'summary_invalidated'
  | 'summary_call_dispatched'
  | 'summary_call_responded'
  | 'summary_completed'
  | 'summary_rejected'
  | 'summary_failed'
  | 'summary_expired'
  | 'summary_feedback_saved';

const ALLOWED_FIELDS = [
  'requestId', 'processId', 'slotId', 'attemptId', 'summaryId', 'rulesVersion', 'configurationHash',
  'durationMs', 'result', 'failureCode', 'inputUnits', 'outputUnits', 'totalUnits', 'unit', 'helpful',
] as const;

export type SummaryOperationalEvent = {
  event: SummaryOperationalEventName;
  requestId?: string | undefined;
  processId?: number;
  slotId?: string | null | undefined;
  attemptId?: string | null | undefined;
  summaryId?: string | undefined;
  rulesVersion?: string;
  configurationHash?: string;
  durationMs?: number;
  result?: string;
  failureCode?: string | null;
  inputUnits?: number | null;
  outputUnits?: number | null;
  totalUnits?: number | null;
  unit?: 'tokens';
  helpful?: boolean;
};

export function logSummaryOperationalEvent(event: SummaryOperationalEvent, target: Logger = logger): void {
  const context = Object.fromEntries(ALLOWED_FIELDS.flatMap((key) =>
    event[key] === undefined ? [] : [[key, event[key]]])) as Record<string, unknown>;
  const message = event.event;
  if (event.event === 'summary_failed' || event.event === 'summary_rejected' || event.event === 'summary_expired') {
    target.error(message, undefined, { event: message, ...context });
    return;
  }
  target.info(message, { event: message, ...context });
}
