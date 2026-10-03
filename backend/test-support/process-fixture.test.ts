import { describe, expect, it } from 'vitest';

import { runProcess } from './process-fixture.js';

describe('processo filho de teste', () => {
  it('captura saída, erro e código do processo filho', async () => {
    const result = await runProcess({
      arguments: ['-c', 'printf saida; printf erro >&2; exit 2'],
      command: '/bin/sh',
      cwd: process.cwd(),
    });

    expect(result).toEqual({
      exitCode: 2,
      signal: null,
      stderr: 'erro',
      stdout: 'saida',
    });
  });
});
