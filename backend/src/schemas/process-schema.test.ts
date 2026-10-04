import { describe, expect, it } from 'vitest';

import { parseCnjInput } from './process-schema.js';

describe('schema de consulta por CNJ', () => {
  it('aceita somente um campo cnj textual', () => {
    expect(parseCnjInput({ cnj: '1002271-82.2025.8.26.0003' })).toEqual({ cnj: '1002271-82.2025.8.26.0003' });
  });

  it('recusa campos adicionais e tipos diferentes de string', () => {
    expect(() => parseCnjInput({ cnj: '1002271-82.2025.8.26.0003', extra: true })).toThrow();
    expect(() => parseCnjInput({ cnj: 123 })).toThrow();
    expect(() => parseCnjInput(null)).toThrow();
  });

  it('classifica CNJ vazio separadamente', () => {
    expect(() => parseCnjInput({ cnj: '  ' })).toThrow(expect.objectContaining({ code: 'CNJ_REQUIRED' }));
  });
});
