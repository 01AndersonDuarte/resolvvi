import type { PublicErrorCode, PublicErrorField } from '../types/errors.js';

export class ApplicationError extends Error {
  public readonly code: PublicErrorCode;
  public readonly status: number;
  public readonly field: PublicErrorField | null;
  public readonly retryAfterSeconds: number | null;

  constructor(input: {
    code: PublicErrorCode;
    message: string;
    status: number;
    field?: PublicErrorField | null;
    retryAfterSeconds?: number | null;
  }) {
    super(input.message);
    this.name = 'ApplicationError';
    this.code = input.code;
    this.status = input.status;
    this.field = input.field ?? null;
    this.retryAfterSeconds = input.retryAfterSeconds ?? null;
  }
}

export function invalidInput(message: string, field: PublicErrorField): ApplicationError {
  return new ApplicationError({ code: 'INVALID_INPUT', message, status: 400, field });
}
