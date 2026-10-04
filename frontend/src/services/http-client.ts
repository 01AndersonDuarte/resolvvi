import type { ApiError, ApiErrorField } from '../types/api';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
};

const FALLBACK_ERROR: ApiError = {
  code: 'SERVICE_UNAVAILABLE',
  message: 'Não foi possível concluir a solicitação. Tente novamente.',
  field: null,
  retryAfterSeconds: null,
};

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number, readonly apiError: ApiError) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function requestJson<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const response = await fetch(path, buildRequestInit(options));

  if (!response.ok) {
    throw await createApiRequestError(response);
  }

  return readResponse<TResponse>(response);
}

function buildRequestInit(options: RequestOptions): RequestInit {
  const headers = options.body === undefined ? undefined : { 'Content-Type': 'application/json' };

  return {
    method: options.method ?? 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  };
}

async function createApiRequestError(response: Response): Promise<ApiRequestError> {
  const payload: unknown = await response.json().catch(() => null);
  const apiError = readApiError(payload);

  return new ApiRequestError(apiError.message, response.status, apiError);
}

async function readResponse<TResponse>(response: Response): Promise<TResponse> {
  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

function readApiError(payload: unknown): ApiError {
  if (!isApiErrorResponse(payload)) {
    return FALLBACK_ERROR;
  }

  return {
    code: payload.error.code,
    message: payload.error.message,
    field: payload.error.field,
    retryAfterSeconds: payload.error.retryAfterSeconds,
  };
}

function isApiErrorResponse(payload: unknown): payload is { error: ApiError } {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return false;
  }

  const { code, message, field, retryAfterSeconds } = payload.error;

  return typeof code === 'string' && typeof message === 'string' && isApiErrorField(field) &&
    (typeof retryAfterSeconds === 'number' || retryAfterSeconds === null);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiErrorField(field: unknown): field is ApiErrorField {
  return field === null || field === 'email' || field === 'password' || field === 'cnj';
}
