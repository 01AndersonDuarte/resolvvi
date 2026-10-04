export type ApplicationEnvironment = {
  databaseLabel: string;
  databaseUrl: string;
  nodeEnvironment: 'development' | 'production' | 'test';
};

export type HttpEnvironment = {
  port: number;
  publicAppUrl: string;
  resendApiKey?: string;
  resendFrom?: string;
};

export type LogContext = Record<string, unknown>;
