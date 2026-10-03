import { expect, it } from 'vitest';

import { parseEnvironment } from './environment-schema.js';

const REQUIRED_ENVIRONMENT = {
  DATABASE_LABEL: 'dev_test_resolvvi_test',
  DATABASE_URL: 'postgresql://test_user:test_password@localhost:55432/dev_test_resolvvi_test',
  NODE_ENV: 'test',
};

it('aplica os padrões mínimos da configuração', () => {
  const result = parseEnvironment(REQUIRED_ENVIRONMENT);

  expect(result).toEqual({
    databaseLabel: 'dev_test_resolvvi_test',
    databaseUrl: REQUIRED_ENVIRONMENT.DATABASE_URL,
    nodeEnvironment: 'test',
  });
});

it('interrompe a configuração sem expor o valor inválido', () => {
  const invalidEnvironment = { ...REQUIRED_ENVIRONMENT, DATABASE_URL: 'senha-super-secreta' };

  expect(() => parseEnvironment(invalidEnvironment)).toThrowError(
    expect.objectContaining({
      message: 'Configuração inválida: DATABASE_URL.',
      name: 'InvalidConfigurationError',
    }),
  );
});
