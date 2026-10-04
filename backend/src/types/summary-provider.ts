import type { ProviderSummaryOutput } from './process-ai-summary.js';

export type SummaryProviderConfiguration = {
  provider: string;
  model: string;
  configurationHash: string;
};
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
