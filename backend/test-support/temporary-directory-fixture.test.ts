import { access } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  createTemporaryTestDirectory,
  removeTemporaryTestDirectory,
} from './temporary-directory-fixture.js';

describe('diretório temporário de teste', () => {
  it('cria e remove somente diretórios sob o prefixo controlado', async () => {
    const directory = await createTemporaryTestDirectory();
    await expect(access(directory)).resolves.toBeUndefined();

    await removeTemporaryTestDirectory(directory);

    await expect(access(directory)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('recusa remover um caminho arbitrário', async () => {
    await expect(removeTemporaryTestDirectory('/tmp')).rejects.toThrow(
      'Diretório fora da área temporária de testes.',
    );
  });
});

