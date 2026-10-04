export type SessionResponse = {
  sessionId: string;
  expiresAt: string;
  serverTime: string;
};

export type ApiErrorField = 'email' | 'password' | 'cnj' | null;

export type ApiError = {
  code: string;
  message: string;
  field: ApiErrorField;
  retryAfterSeconds: number | null;
};

export type RequestFailure = {
  status: number;
  error: ApiError;
};
