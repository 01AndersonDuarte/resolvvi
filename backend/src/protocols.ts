export type ApplicationEnvironment = {
  databaseLabel: string;
  databaseUrl: string;
  nodeEnvironment: 'development' | 'production' | 'test';
};

export type LogContext = Record<string, unknown>;
