import type { ProviderSummaryOutput } from './process-ai-summary.js';

export type SummaryProviderConfiguration = {
  provider: string;
  model: string;
  configurationHash: string;
};
export type SummaryProviderFailureCode = 'rate_limited' | 'unavailable' | 'rejected' | 'invalid_response';
export class SummaryProviderError extends Error {
  constructor(
    public readonly code: SummaryProviderFailureCode,
    public readonly retryAfterMs: number | null = null,
  ) {
    super(`Summary provider failed: ${code}`);
    this.name = 'SummaryProviderError';
  }
}
export type SummaryProviderInput = {
  instructions: string;
  source: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
  signal: AbortSignal;
};
export type SummaryProviderResult = {
  output: unknown;
  status: 'completed' | 'incomplete' | 'failed';
  refusal: string | null;
  model: string;
  usage: { inputTokens: number; outputTokens: number } | null;
  providerRequestId?: string | null;
};
export type SummaryProvider = {
  configuration: SummaryProviderConfiguration;
  generate(input: SummaryProviderInput): Promise<SummaryProviderResult>;
};
export type ValidatedSummary = {
  output: ProviderSummaryOutput;
  body: string;
  references: SummaryReference[];
};

import type { SummaryReference } from './process-ai-summary.js';
