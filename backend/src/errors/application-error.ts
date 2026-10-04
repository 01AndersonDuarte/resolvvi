export type PublicErrorCode =
  | 'INVALID_INPUT'
  | 'VERIFICATION_RATE_LIMITED'
  | 'CONFIRMATION_SEND_FAILED'
  | 'CONFIRMATION_SEND_UNKNOWN'
  | 'SERVICE_UNAVAILABLE';

export class ApplicationError extends Error {
  public readonly code: PublicErrorCode;
  public readonly status: number;
  public readonly field: 'email' | 'password' | null;
  public readonly retryAfterSeconds: number | null;

  constructor(input: {
    code: PublicErrorCode;
    message: string;
    status: number;
    field?: 'email' | 'password' | null;
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

export function invalidInput(message: string, field: 'email' | 'password'): ApplicationError {
  return new ApplicationError({ code: 'INVALID_INPUT', message, status: 400, field });
}
