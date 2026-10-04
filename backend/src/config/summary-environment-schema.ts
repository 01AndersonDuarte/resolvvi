import Joi from 'joi';
import { configurationError } from '../errors/configuration-error.js';
import type { SummaryEnvironment } from '../types/config.js';

type RawSummaryEnvironment = {
  SUMMARY_ENABLED: boolean;
  SUMMARY_API_KEY?: string;
  SUMMARY_PROVIDER: 'openai';
  SUMMARY_MODEL: string;
  SUMMARY_CONTEXT_CAPACITY: number;
};

const summaryEnvironmentSchema = Joi.object<RawSummaryEnvironment>({
  SUMMARY_ENABLED: Joi.boolean().default(false),
  SUMMARY_API_KEY: Joi.string().trim().min(1).when('SUMMARY_ENABLED', { is: true, then: Joi.required(), otherwise: Joi.optional() }),
  SUMMARY_PROVIDER: Joi.string().valid('openai').default('openai'),
  SUMMARY_MODEL: Joi.string().trim().min(1).default('gpt-4.1-mini-2025-04-14'),
  SUMMARY_CONTEXT_CAPACITY: Joi.number().integer().min(1).default(131_072),
}).unknown(true);

export function parseSummaryEnvironment(source: NodeJS.ProcessEnv): SummaryEnvironment {
  const validation = summaryEnvironmentSchema.validate(source, { abortEarly: false });
  if (validation.error) {
    throw configurationError(validation.error.details.map((detail) => detail.path.join('.')));
  }

  const value = validation.value;
  return {
    enabled: value.SUMMARY_ENABLED,
    apiKey: value.SUMMARY_API_KEY ?? null,
    provider: value.SUMMARY_PROVIDER,
    model: value.SUMMARY_MODEL,
    contextCapacity: value.SUMMARY_CONTEXT_CAPACITY,
  };
}
