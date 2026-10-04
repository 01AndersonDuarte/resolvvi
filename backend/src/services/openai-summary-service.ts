import { createHash } from 'node:crypto';
import type { SummaryEnvironment } from '../types/config.js';
import type { SummaryProvider, SummaryProviderInput, SummaryProviderResult } from '../types/summary-provider.js';
import { SummaryProviderError } from '../types/summary-provider.js';
import { SUMMARY_OUTPUT_TOKEN_LIMIT, SUMMARY_RULES_VERSION } from './summary-prompt-service.js';

const RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OUTPUT_TOKEN_LIMIT = 4_096;
const MINIMUM_COOLDOWN_MS = 30_000;
const JSON_SCHEMA_NAME = 'process_ai_summary';

type SummaryFetch = typeof fetch;
type ProviderResponseBody = {
  id?: unknown;
  status?: unknown;
  model?: unknown;
  incomplete_details?: { reason?: unknown } | null;
  output?: unknown;
  usage?: { input_tokens?: unknown; output_tokens?: unknown } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function contentParts(value: unknown[]): unknown[] {
  return value.flatMap((item: unknown) => {
    if (!isRecord(item) || !Array.isArray(item.content)) return [];
    return item.content as unknown[];
  });
}

function retryAfterMilliseconds(value: string | null, now: number): number {
  if (!value) return MINIMUM_COOLDOWN_MS;
  const seconds = Number(value);
  const requestedDelay = Number.isFinite(seconds) && seconds >= 0
    ? seconds * 1_000
    : Date.parse(value) - now;
  return Math.max(MINIMUM_COOLDOWN_MS, Number.isFinite(requestedDelay) ? requestedDelay : 0);
}

function classifyHttpFailure(status: number, retryAfter: string | null, now: number): SummaryProviderError {
  if (status === 429) return new SummaryProviderError('rate_limited', retryAfterMilliseconds(retryAfter, now));
  if (status >= 500 || status === 408) return new SummaryProviderError('unavailable', MINIMUM_COOLDOWN_MS);
  return new SummaryProviderError('rejected');
}

function parseUsage(value: ProviderResponseBody['usage']): SummaryProviderResult['usage'] {
  if (!value || typeof value.input_tokens !== 'number' || typeof value.output_tokens !== 'number') return null;
  return { inputTokens: value.input_tokens, outputTokens: value.output_tokens };
}

function extractOutput(value: unknown): { output: unknown; refusal: string | null } {
  if (!Array.isArray(value)) throw new SummaryProviderError('invalid_response');
  const parts = contentParts(value);
  const refusal = parts.find((part) => isRecord(part) && part.type === 'refusal');
  if (isRecord(refusal) && typeof refusal.refusal === 'string') return { output: null, refusal: refusal.refusal };
  const text = parts.find((part) => isRecord(part) && part.type === 'output_text');
  if (!isRecord(text) || typeof text.text !== 'string') throw new SummaryProviderError('invalid_response');
  return { output: text.text, refusal: null };
}

async function readResponse(response: Response, expectedModel: string): Promise<SummaryProviderResult> {
  let body: unknown;
  try {
    body = await response.json() as unknown;
  } catch {
    throw new SummaryProviderError('invalid_response');
  }
  if (!isRecord(body)) throw new SummaryProviderError('invalid_response');

  const providerBody = body as ProviderResponseBody;
  const output = extractOutput(providerBody.output);
  const status = providerBody.status === 'completed'
    ? 'completed'
    : providerBody.incomplete_details?.reason === 'max_output_tokens' ? 'incomplete' : 'failed';
  return {
    output: output.output,
    status,
    refusal: output.refusal,
    model: typeof providerBody.model === 'string' ? providerBody.model : expectedModel,
    usage: parseUsage(providerBody.usage),
    providerRequestId: typeof providerBody.id === 'string' ? providerBody.id : response.headers.get('x-request-id'),
  };
}

function buildRequestBody(input: SummaryProviderInput, model: string): Record<string, unknown> {
  return {
    model,
    store: false,
    background: false,
    stream: false,
    truncation: 'disabled',
    max_output_tokens: Math.min(input.maxOutputTokens, OUTPUT_TOKEN_LIMIT),
    temperature: 0,
    input: [
      { role: 'developer', content: [{ type: 'input_text', text: input.instructions }] },
      { role: 'user', content: [{ type: 'input_text', text: input.source }] },
    ],
    text: {
      format: { type: 'json_schema', name: JSON_SCHEMA_NAME, strict: true, schema: input.schema },
    },
  };
}

function createConfigurationHash(configuration: SummaryEnvironment): string {
  return createHash('sha256').update(JSON.stringify({
    provider: configuration.provider,
    model: configuration.model,
    rulesVersion: SUMMARY_RULES_VERSION,
    contextCapacity: configuration.contextCapacity,
    outputTokenLimit: SUMMARY_OUTPUT_TOKEN_LIMIT,
    store: false,
    temperature: 0,
  })).digest('hex');
}

export function createOpenAiSummaryProvider(
  configuration: SummaryEnvironment,
  transport: SummaryFetch = fetch,
  now: () => number = Date.now,
): SummaryProvider {
  if (!configuration.enabled || !configuration.apiKey) {
    throw new Error('Summary generation is disabled or missing credentials.');
  }
  const providerConfiguration = {
    provider: configuration.provider,
    model: configuration.model,
    configurationHash: createConfigurationHash(configuration),
  };

  return {
    configuration: providerConfiguration,
    generate: async (input) => {
      const response = await transport(RESPONSES_URL, {
        method: 'POST',
        headers: { authorization: `Bearer ${configuration.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify(buildRequestBody(input, configuration.model)),
        signal: input.signal,
      });
      if (!response.ok) throw classifyHttpFailure(response.status, response.headers.get('retry-after'), now());
      return readResponse(response, configuration.model);
    },
  };
}
