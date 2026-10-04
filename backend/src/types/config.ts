export type ApplicationEnvironment = {
  databaseLabel: string;
  databaseUrl: string;
  nodeEnvironment: 'development' | 'production' | 'test';
  summary: SummaryEnvironment;
};

export type SummaryEnvironment = {
  enabled: boolean;
  apiKey: string | null;
  provider: 'openai';
  model: string;
  contextCapacity: number;
};

export type HttpEnvironment = {
  port: number;
  publicAppUrl: string;
};

export type LogContext = Record<string, unknown>;
