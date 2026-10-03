import { resolve } from 'node:path';

import Joi from 'joi';

import { configurationError } from '../errors/index.js';
import type { ApplicationEnvironment } from '../protocols.js';

const DEFAULT_REPORTS_DIRECTORY = 'var/imports';

type RawEnvironment = {
  DATABASE_LABEL: string;
  DATABASE_URL: string;
  DB_CONNECT_TIMEOUT_MS: number;
  DB_STATEMENT_TIMEOUT_MS: number;
  DB_TRANSACTION_TIMEOUT_MS: number;
  IMPORT_REPORTS_DIR: string;
  NODE_ENV: ApplicationEnvironment['nodeEnvironment'];
  SHUTDOWN_TIMEOUT_MS: number;
};

const environmentSchema = Joi.object<RawEnvironment>({
  DATABASE_LABEL: Joi.string().pattern(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/).required(),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  DB_CONNECT_TIMEOUT_MS: Joi.number().integer().positive().default(5_000),
  DB_STATEMENT_TIMEOUT_MS: Joi.number().integer().positive().default(10_000),
  DB_TRANSACTION_TIMEOUT_MS: Joi.number().integer().positive().default(15_000),
  IMPORT_REPORTS_DIR: Joi.string().trim().min(1).default(DEFAULT_REPORTS_DIRECTORY),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  SHUTDOWN_TIMEOUT_MS: Joi.number().integer().positive().default(20_000),
}).unknown(true);

function invalidFields(error: Joi.ValidationError): string[] {
  return error.details.map((detail) => detail.path.join('.'));
}

export function parseEnvironment(
  source: NodeJS.ProcessEnv,
  backendRoot: string,
): ApplicationEnvironment {
  const validation = environmentSchema.validate(source, { abortEarly: false });
  if (validation.error) {
    throw configurationError(invalidFields(validation.error));
  }

  const value = validation.value;
  return {
    databaseLabel: value.DATABASE_LABEL,
    databaseUrl: value.DATABASE_URL,
    dbConnectTimeoutMs: value.DB_CONNECT_TIMEOUT_MS,
    dbStatementTimeoutMs: value.DB_STATEMENT_TIMEOUT_MS,
    dbTransactionTimeoutMs: value.DB_TRANSACTION_TIMEOUT_MS,
    nodeEnvironment: value.NODE_ENV,
    reportsDirectory: resolve(backendRoot, value.IMPORT_REPORTS_DIR),
    shutdownTimeoutMs: value.SHUTDOWN_TIMEOUT_MS,
  };
}
