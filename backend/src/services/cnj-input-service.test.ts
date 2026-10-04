import { describe, expect, it } from 'vitest';

import { normalizeCnjInput } from './cnj-input-service.js';

const MASKED_CNJ = '1002271-82.2025.8.26.0003';
const UNMASKED_CNJ = '10022718220258260003';

describe('normalização de CNJ', () => {
  it('mantém a máscara canônica', () => {
    expect(normalizeCnjInput(MASKED_CNJ)).toBe(MASKED_CNJ);
  });

  it('converte 20 dígitos ASCII para a máscara canônica', () => {
    expect(normalizeCnjInput(UNMASKED_CNJ)).toBe(MASKED_CNJ);
  });

  it('preserva zeros à esquerda', () => {
    expect(normalizeCnjInput('0000001-01.2025.8.26.0003')).toBe('0000001-01.2025.8.26.0003');
  });

  it('não calcula nem rejeita o dígito verificador', () => {
    expect(normalizeCnjInput('1002271-00.2025.8.26.0003')).toBe('1002271-00.2025.8.26.0003');
  });

  it.each(['', '   '])('distingue entrada vazia %j', rejectEmptyInput);
  it.each([
    '1002271-82.2025.8.26.000',
    '1002271 82.2025.8.26.0003',
    '1002271-8X.2025.8.26.0003',
    '100227182202582600030',
  ])('recusa estrutura fora do padrão: %s', rejectMalformedInput);
});

function rejectEmptyInput(value: string): void {
  expect(() => normalizeCnjInput(value)).toThrow(expect.objectContaining({ code: 'CNJ_REQUIRED' }));
}

function rejectMalformedInput(value: string): void {
  expect(() => normalizeCnjInput(value)).toThrow(expect.objectContaining({ code: 'CNJ_FORMAT_INVALID' }));
}
