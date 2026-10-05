import Joi from 'joi';
import { ApplicationError } from '../errors/application-error.js';
import { parseProcessId } from './process-schema.js';
import type { ProviderSummaryOutput, SourceMovement } from '../types/process-ai-summary.js';

const MAX_MOVEMENT_TEXT_LENGTH = 100_000;
const referenceSchema = Joi.string().pattern(/^m[1-9]\d*$/).required();
const sourceMovementSchema = Joi.object<SourceMovement>({
  ref: referenceSchema,
  movementId: Joi.number().integer().positive().required(),
  processId: Joi.number().integer().positive().required(),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  title: Joi.string().max(MAX_MOVEMENT_TEXT_LENGTH).required(),
  content: Joi.string().max(MAX_MOVEMENT_TEXT_LENGTH).allow(null).required(),
  sourceOrder: Joi.number().integer().min(0).required(),
}).unknown(false);

export const sourceMovementsSchema = Joi.array().items(sourceMovementSchema).max(100_000).required();

const sentenceSchema = Joi.object({
  text: Joi.string().min(1).max(1_500).required(),
  sourceRefs: Joi.array().items(referenceSchema).min(1).max(100).unique().required(),
}).unknown(false);

const paragraphSchema = Joi.object({ sentences: Joi.array().items(sentenceSchema).min(1).max(100).required() }).unknown(false);

export const providerSummaryOutputSchema = Joi.object<ProviderSummaryOutput>({
  language: Joi.string().valid('pt-BR').required(),
  paragraphs: Joi.array().items(paragraphSchema).min(1).max(3).required(),
}).unknown(false);

export const providerSummaryJsonSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['language', 'paragraphs'],
  properties: {
    language: { type: 'string', enum: ['pt-BR'] },
    paragraphs: {
      type: 'array', minItems: 1, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false, required: ['sentences'],
        properties: {
          sentences: {
            type: 'array', minItems: 1,
            items: {
              type: 'object', additionalProperties: false, required: ['text', 'sourceRefs'],
              properties: { text: { type: 'string' }, sourceRefs: { type: 'array', items: { type: 'string' } } },
            },
          },
        },
      },
    },
  },
};

export type SummaryReadQuery = { attemptId?: string; track?: boolean };
export type SummaryFeedbackInput = { helpful: boolean };

export function parseSummaryProcessId(value: unknown): number {
  return parseProcessId(value);
}

export function parseSummaryId(value: unknown): string {
  const result = Joi.string().guid().validate(value, { convert: false });
  if (result.error) throw invalidSummaryInput('O identificador do resumo é inválido.');
  return result.value;
}

export function parseSummaryReadQuery(value: unknown): SummaryReadQuery {
  const result = Joi.object({ attemptId: Joi.string().guid().optional(), track: Joi.boolean().optional() })
    .unknown(false).validate(value, { abortEarly: true });
  if (result.error) throw invalidSummaryInput('Os parâmetros do resumo são inválidos.');
  return result.value as SummaryReadQuery;
}

export function parseSummaryGenerationBody(value: unknown): Record<string, never> {
  const result = Joi.object({}).unknown(false).validate(value, { abortEarly: true, convert: false });
  if (result.error) throw invalidSummaryInput('A solicitação de geração não aceita parâmetros.');
  return {};
}

export function parseSummaryFeedbackBody(value: unknown): SummaryFeedbackInput {
  const result = Joi.object({ helpful: Joi.boolean().required() }).unknown(false)
    .validate(value, { abortEarly: true, convert: false });
  if (result.error) throw invalidSummaryInput('Informe uma avaliação válida.');
  return result.value as SummaryFeedbackInput;
}

function invalidSummaryInput(message: string): ApplicationError {
  return new ApplicationError({ code: 'INVALID_INPUT', message, status: 400 });
}
