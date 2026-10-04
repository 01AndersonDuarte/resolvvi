export type PublicErrorCode =
  | 'INVALID_INPUT'
  | 'VERIFICATION_RATE_LIMITED'
  | 'CONFIRMATION_SEND_FAILED'
  | 'CONFIRMATION_SEND_UNKNOWN'
  | 'VERIFICATION_INVALID'
  | 'SERVICE_UNAVAILABLE';

export type PublicErrorField = 'email' | 'password';
