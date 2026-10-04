import Joi from 'joi';

import { configurationError } from '../errors/index.js';
import type { HttpEnvironment } from '../types/config.js';

type RawHttpEnvironment = {
  PORT: number;
  PUBLIC_APP_URL: string;
};

const httpEnvironmentSchema = Joi.object<RawHttpEnvironment>({
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  PUBLIC_APP_URL: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
}).unknown(true);

export function parseHttpEnvironment(source: NodeJS.ProcessEnv): HttpEnvironment {
  const validation = httpEnvironmentSchema.validate(source, { abortEarly: false });
  if (validation.error) {
    throw configurationError(validation.error.details.map((detail) => detail.path.join('.')));
  }

  const publicUrl = new URL(validation.value.PUBLIC_APP_URL);
  if (
    publicUrl.username ||
    publicUrl.password ||
    publicUrl.pathname !== '/' ||
    publicUrl.search ||
    publicUrl.hash ||
    (source.NODE_ENV === 'production' && publicUrl.protocol !== 'https:')
  ) {
    throw configurationError(['PUBLIC_APP_URL']);
  }

  return {
    port: validation.value.PORT,
    publicAppUrl: publicUrl.origin,
  };
}
