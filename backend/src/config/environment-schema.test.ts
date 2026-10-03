import { resolve } from 'node:path';

import { expect, it } from 'vitest';

import { parseEnvironment } from './environment-schema.js';

const BACKEND_ROOT = '/workspace/backend';
const REQUIRED_ENVIRONMENT = {
  DATABASE_LABEL: 'judicial-test',
  DATABASE_URL: 'postgresql://test_user:test_password@localhost:55432/harness_test',
  NODE_ENV: 'test',
};

it('aplica padrões determinísticos e resolve o diretório de relatórios', () => {
  const result = parseEnvironment(REQUIRED_ENVIRONMENT, BACKEND_ROOT);

  expect(result).toEqual({
    databaseLabel: 'judicial-test',
    databaseUrl: REQUIRED_ENVIRONMENT.DATABASE_URL,
    dbConnectTimeoutMs: 5_000,
    dbStatementTimeoutMs: 10_000,
    dbTransactionTimeoutMs: 15_000,
    nodeEnvironment: 'test',
    reportsDirectory: resolve(BACKEND_ROOT, 'var/imports'),
    shutdownTimeoutMs: 20_000,
  });
});

it('aceita tempos positivos configurados pelo ambiente', () => {
  const result = parseEnvironment({
    ...REQUIRED_ENVIRONMENT,
    DB_CONNECT_TIMEOUT_MS: '1',
    DB_STATEMENT_TIMEOUT_MS: '2',
    DB_TRANSACTION_TIMEOUT_MS: '3',
    IMPORT_REPORTS_DIR: 'reports',
    SHUTDOWN_TIMEOUT_MS: '4',
  }, BACKEND_ROOT);

  expect(result).toMatchObject({
    dbConnectTimeoutMs: 1,
    dbStatementTimeoutMs: 2,
    dbTransactionTimeoutMs: 3,
    reportsDirectory: resolve(BACKEND_ROOT, 'reports'),
    shutdownTimeoutMs: 4,
  });
});

it('interrompe a configuração sem expor o valor inválido', () => {
  const invalidEnvironment = { ...REQUIRED_ENVIRONMENT, DATABASE_URL: 'senha-super-secreta' };

  expect(() => parseEnvironment(invalidEnvironment, BACKEND_ROOT)).toThrowError(
    expect.objectContaining({
      message: 'Configuração inválida: DATABASE_URL.',
      name: 'InvalidConfigurationError',
    }),
  );
});
