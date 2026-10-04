import Joi from 'joi';

import { configurationError } from '../errors/index.js';
import type { ApplicationEnvironment } from '../types/config.js';
import { parseSummaryEnvironment } from './summary-environment-schema.js';

type RawEnvironment = {
  DATABASE_LABEL: string;
  DATABASE_URL: string;
  NODE_ENV: ApplicationEnvironment['nodeEnvironment'];
};

const environmentSchema = Joi.object<RawEnvironment>({
  DATABASE_LABEL: Joi.string().pattern(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/).required(),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
}).unknown(true);

function invalidFields(error: Joi.ValidationError): string[] {
  return error.details.map((detail) => detail.path.join('.'));
}

export function parseEnvironment(source: NodeJS.ProcessEnv): ApplicationEnvironment {
  const validation = environmentSchema.validate(source, { abortEarly: false });
  if (validation.error) {
    throw configurationError(invalidFields(validation.error));
  }

  const value = validation.value;
  return {
    databaseLabel: value.DATABASE_LABEL,
    databaseUrl: value.DATABASE_URL,
    nodeEnvironment: value.NODE_ENV,
    summary: parseSummaryEnvironment(source),
  };
}
