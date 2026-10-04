export type ProcessAiSummaryErrorCode =
  | 'SUMMARY_SOURCE_INVALID'
  | 'SUMMARY_SOURCE_TOO_LARGE'
  | 'SUMMARY_SOURCE_PREPARATION_TIMEOUT'
  | 'SUMMARY_OUTPUT_INVALID'
  | 'SUMMARY_OUTPUT_LANGUAGE_INVALID';

export class ProcessAiSummaryError extends Error {
  constructor(public readonly code: ProcessAiSummaryErrorCode, message: string) {
    super(message);
    this.name = 'ProcessAiSummaryError';
  }
}

export function summarySourceInvalid(): ProcessAiSummaryError {
  return new ProcessAiSummaryError('SUMMARY_SOURCE_INVALID', 'The summary source is invalid.');
}

export function summarySourceTooLarge(): ProcessAiSummaryError {
  return new ProcessAiSummaryError('SUMMARY_SOURCE_TOO_LARGE', 'The summary source exceeds the context limit.');
}

export function summaryPreparationTimeout(): ProcessAiSummaryError {
  return new ProcessAiSummaryError('SUMMARY_SOURCE_PREPARATION_TIMEOUT', 'The summary source could not be prepared in time.');
}

export function summaryOutputInvalid(): ProcessAiSummaryError {
  return new ProcessAiSummaryError('SUMMARY_OUTPUT_INVALID', 'The provider output is invalid.');
}

export function summaryOutputLanguageInvalid(): ProcessAiSummaryError {
  return new ProcessAiSummaryError('SUMMARY_OUTPUT_LANGUAGE_INVALID', 'The provider output is not in Portuguese.');
}

export function summaryApplicationError(input: {
  code: 'SUMMARY_NOT_FOUND' | 'SUMMARY_NOT_CURRENT' | 'SUMMARY_NOT_ELIGIBLE' | 'SUMMARY_RETRY_TOO_SOON' | 'SUMMARY_CAPACITY_EXCEEDED' | 'SUMMARY_READ_FAILED' | 'SUMMARY_SAVE_FAILED' | 'SUMMARY_FEEDBACK_FAILED' | 'SERVICE_UNAVAILABLE';
  message: string;
  status: number;
  retryAfterSeconds?: number | null;
}): import('./application-error.js').ApplicationError {
  return new ApplicationError(input);
}
import { ApplicationError } from './application-error.js';
