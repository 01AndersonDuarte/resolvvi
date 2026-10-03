export type ApplicationEnvironment = {
  databaseLabel: string;
  databaseUrl: string;
  dbConnectTimeoutMs: number;
  dbStatementTimeoutMs: number;
  dbTransactionTimeoutMs: number;
  nodeEnvironment: 'development' | 'production' | 'test';
  reportsDirectory: string;
  shutdownTimeoutMs: number;
};

export type LogContext = Record<string, unknown>;

