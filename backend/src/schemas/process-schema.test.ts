import { describe, expect, it } from 'vitest';

import { parseCnjInput, parseProcessId } from './process-schema.js';

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

describe('schema de identificador de processo', () => {
  it('aceita IDs decimais positivos dentro do limite do banco', () => {
    expect(parseProcessId('17')).toBe(17);
    expect(parseProcessId('2147483647')).toBe(2147483647);
  });

  it.each(['', '0', '01', '-1', '1.2', '1e2', '2147483648', '99999999999999999999'])('classifica %s como entrada inválida', (id) => {
    expect(() => parseProcessId(id)).toThrow(expect.objectContaining({
      code: 'INVALID_INPUT', status: 400, field: null,
    }));
  });
});
