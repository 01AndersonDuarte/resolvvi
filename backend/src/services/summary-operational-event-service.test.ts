import { describe, expect, it, vi } from 'vitest';
import type { Logger } from '../config/logger.js';
import { logSummaryOperationalEvent } from './summary-operational-event-service.js';

describe('logSummaryOperationalEvent', () => {
  it('logs only approved operational fields and excludes content and identity', logsOnlyApprovedFields);
  it('logs absent consumption as null without changing the sanitizer', logsNullConsumption);
});

function createLoggerSpy(): Logger {
  return { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
}

function logsOnlyApprovedFields(): void {
  const target = createLoggerSpy();
  logSummaryOperationalEvent({
    event: 'summary_completed', processId: 12, rulesVersion: 'summary-rules-v1',
    prompt: 'must not pass', email: 'must not pass', inputUnits: 15, outputUnits: 5, totalUnits: 20, unit: 'tokens',
  } as Parameters<typeof logSummaryOperationalEvent>[0], target);

  expect(target.info).toHaveBeenCalledWith('summary_completed', {
    event: 'summary_completed', processId: 12, rulesVersion: 'summary-rules-v1',
    inputUnits: 15, outputUnits: 5, totalUnits: 20, unit: 'tokens',
  });
}

function logsNullConsumption(): void {
  const target = createLoggerSpy();
  logSummaryOperationalEvent({ event: 'summary_failed', inputUnits: null, outputUnits: null, totalUnits: null }, target);

  expect(target.error).toHaveBeenCalledWith('summary_failed', undefined, {
    event: 'summary_failed', inputUnits: null, outputUnits: null, totalUnits: null,
  });
}
