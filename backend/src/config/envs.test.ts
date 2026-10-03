import { afterEach, describe, expect, it, vi } from 'vitest';

const VALID_ENVIRONMENT = {
  DATABASE_LABEL: 'judicial-test',
  DATABASE_URL: 'postgresql://test_user:test_password@localhost:55432/harness_test',
  NODE_ENV: 'test',
};

function stubEnvironment(environment: Record<string, string>): void {
  Object.entries(environment).forEach(([name, value]) => vi.stubEnv(name, value));
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('env', () => {
  it('carrega e valida a configuração antes da aplicação', async () => {
    stubEnvironment(VALID_ENVIRONMENT);

    const { env } = await import('./index.js');

    expect(env).toMatchObject({
      databaseLabel: 'judicial-test',
      nodeEnvironment: 'test',
    });
  });

  it('falha durante a inicialização quando a configuração é inválida', async () => {
    stubEnvironment({ ...VALID_ENVIRONMENT, DATABASE_URL: 'senha-super-secreta' });

    await expect(import('./envs.js')).rejects.toMatchObject({
      message: 'Configuração inválida: DATABASE_URL.',
      name: 'InvalidConfigurationError',
    });
  });

  it('usa desenvolvimento quando NODE_ENV não foi definido', async () => {
    stubEnvironment(VALID_ENVIRONMENT);
    vi.stubEnv('NODE_ENV', undefined);

    const { env } = await import('./envs.js');

    expect(env.nodeEnvironment).toBe('development');
  });
});
