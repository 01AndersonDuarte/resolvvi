import type { LogContext } from '../protocols.js';
import { sanitizeLogContext, sanitizeLogMessage } from './sanitize-log-context.js';

type LogLevel = 'error' | 'info' | 'warn';

type LoggerDependencies = {
  now: () => Date;
  stderr: (line: string) => void;
  stdout: (line: string) => void;
};

type LogInput = {
  context?: LogContext | undefined;
  error?: unknown;
  level: LogLevel;
  message: string;
};

export type Logger = {
  error: (message: string, error?: unknown, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
};

function sanitizedError(error: unknown): LogContext {
  if (error === undefined) {
    return {};
  }

  return { error: error instanceof Error ? { name: error.name } : { name: 'UnknownError' } };
}

export function createLogger(dependencies: LoggerDependencies): Logger {
  function emit(input: LogInput): void {
    const line = JSON.stringify({
      timestamp: dependencies.now().toISOString(),
      level: input.level,
      message: sanitizeLogMessage(input.message),
      ...sanitizeLogContext(input.context),
      ...sanitizedError(input.error),
    });
    const output = input.level === 'error' ? dependencies.stderr : dependencies.stdout;
    output(line);
  }

  return {
    error: (message, error, context) => emit({ context, error, level: 'error', message }),
    info: (message, context) => emit({ context, level: 'info', message }),
    warn: (message, context) => emit({ context, level: 'warn', message }),
  };
}

export const logger = createLogger({
  now: () => new Date(),
  stderr: (line) => console.error(line),
  stdout: (line) => console.log(line),
});
