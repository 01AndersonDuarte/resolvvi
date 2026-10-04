import type { LogContext } from '../protocols.js';

const REDACTED = '[REDACTED]';
const CIRCULAR = '[CIRCULAR]';
const SENSITIVE_KEY = /(authorization|cnj|connection|string|cookie|credential|database.?url|email|password|path|secret|token)/i;
const CREDENTIAL_URL = /[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s@]+@/gi;

type SanitizeState = {
  key?: string;
  seen: WeakSet<object>;
};

function sanitizeString(value: string): string {
  return value.replace(CREDENTIAL_URL, `${REDACTED}@`);
}

function sanitizeObject(value: object, state: SanitizeState): unknown {
  if (state.seen.has(value)) {
    return CIRCULAR;
  }
  state.seen.add(value);

  if (value instanceof Error) {
    return { name: value.name };
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, { seen: state.seen }));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, sanitizeValue(item, { key, seen: state.seen })]),
  );
}

function sanitizeValue(value: unknown, state: SanitizeState): unknown {
  if (state.key && SENSITIVE_KEY.test(state.key)) {
    return REDACTED;
  }
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'object' && value !== null) {
    return sanitizeObject(value, state);
  }

  return value;
}

export function sanitizeLogContext(context: LogContext = {}): LogContext {
  return sanitizeObject(context, { seen: new WeakSet<object>() }) as LogContext;
}

export function sanitizeLogMessage(message: string): string {
  return sanitizeString(message);
}
