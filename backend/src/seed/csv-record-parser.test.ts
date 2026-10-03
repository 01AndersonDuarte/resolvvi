import { describe, expect, it } from 'vitest';

import { parseCsvRecords } from './csv-record-parser.js';

describe('parser dos registros CSV', () => {
  it('preserva vírgulas, aspas escapadas e quebras de linha em campos citados', parseQuotedFields);

  it('rejeita campos citados sem fechamento', () => {
    expect(() => parseCsvRecords('a,b\n1,"incompleto')).toThrow('campo entre aspas não foi fechado');
  });

  it('rejeita texto depois do fechamento das aspas', () => {
    expect(() => parseCsvRecords('a,b\n1,"valor"x')).toThrow('conteúdo após o fechamento de aspas');
  });
});

function parseQuotedFields(): void {
  const records = parseCsvRecords('a,b\r\n1,"texto, ""citado""\r\nna segunda linha"');

  expect(records).toEqual([
    ['a', 'b'],
    ['1', 'texto, "citado"\r\nna segunda linha'],
  ]);
}
