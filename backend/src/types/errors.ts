export type PublicErrorCode =
  | 'INVALID_INPUT'
  | 'CNJ_REQUIRED'
  | 'CNJ_FORMAT_INVALID'
  | 'PROCESS_NOT_FOUND'
  | 'SERVICE_UNAVAILABLE'
  | 'REQUEST_TIMEOUT'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_ALREADY_EXISTS'
  | 'SESSION_INVALID';

export type PublicErrorField = 'email' | 'password' | 'cnj';
