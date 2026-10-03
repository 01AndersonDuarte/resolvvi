import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseSeedFile } from './parse-seed-file.js';

const fixturePath = fileURLToPath(new URL('../../../lawsuits_movements.csv', import.meta.url));

describe('leitura do arquivo de seed', () => {
  it('mapeia o CSV fornecido em 100 processos e 5.568 movimentações', async () => {
    const processes = await parseSeedFile(fixturePath);

    expect(processes).toHaveLength(100);
    expect(processes.reduce((total, process) => total + process.movements.length, 0)).toBe(5568);
  });

  it('propaga falha quando o arquivo não pode ser lido', async () => {
    await expect(parseSeedFile('/arquivo-inexistente/lawsuits_movements.csv')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});
