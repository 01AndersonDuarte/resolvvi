import { describe, expect, it, vi } from 'vitest';

import {
  createTestDatabase,
  createTestDatabaseName,
  dropTestDatabase,
} from './database-fixture.js';

describe('isolamento de banco de teste', () => {
  it('gera um nome distinto e seguro para cada worker', () => {
    const first = createTestDatabaseName({ runId: 'run-ABC', workerIndex: 0 });
    const second = createTestDatabaseName({ runId: 'run-ABC', workerIndex: 1 });

    expect(first).toBe('harness_test_runabc_w0');
    expect(second).toBe('harness_test_runabc_w1');
  });

  it('cria e remove somente o banco explicitamente marcado como teste', async () => {
    const query = vi.fn(() => Promise.resolve(undefined));
    const administrator = { query };

    await createTestDatabase(administrator, 'harness_test_runabc_w0');
    await dropTestDatabase(administrator, 'harness_test_runabc_w0');

    expect(query).toHaveBeenNthCalledWith(1, 'CREATE DATABASE "harness_test_runabc_w0"');
    expect(query).toHaveBeenNthCalledWith(
      2,
      'DROP DATABASE IF EXISTS "harness_test_runabc_w0" WITH (FORCE)',
    );
  });

  it('recusa remover um banco sem o prefixo de teste', async () => {
    const query = vi.fn(() => Promise.resolve(undefined));

    await expect(dropTestDatabase({ query }, 'postgres')).rejects.toThrow(
      'Operação permitida somente em banco explicitamente identificado como teste.',
    );
    expect(query).not.toHaveBeenCalled();
  });
});
