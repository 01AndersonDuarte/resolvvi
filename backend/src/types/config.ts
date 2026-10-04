export type ApplicationEnvironment = {
  databaseLabel: string;
  databaseUrl: string;
  nodeEnvironment: 'development' | 'production' | 'test';
};

export type HttpEnvironment = {
  port: number;
  publicAppUrl: string;
};

export type LogContext = Record<string, unknown>;
