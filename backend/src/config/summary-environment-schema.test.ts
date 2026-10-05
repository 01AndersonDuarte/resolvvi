import { describe, expect, it } from 'vitest';
import { parseSummaryEnvironment } from './summary-environment-schema.js';

describe('parseSummaryEnvironment', () => {
  it('desativa a geração externa por padrão', () => {
    expect(parseSummaryEnvironment({})).toEqual({
      enabled: false,
      apiKey: null,
      provider: 'openai',
      model: 'gpt-4.1-2025-04-14',
      contextCapacity: 131_072,
    });
  });

  it('exige chave quando a geração está habilitada', () => {
    expect(() => parseSummaryEnvironment({ SUMMARY_ENABLED: 'true' }))
      .toThrowError(expect.objectContaining({ message: 'Configuração inválida: SUMMARY_API_KEY.' }));
  });

  it('rejeita provedor ou capacidade fora dos limites aceitos', () => {
    expect(() => parseSummaryEnvironment({ SUMMARY_PROVIDER: 'other' }))
      .toThrowError(expect.objectContaining({ message: 'Configuração inválida: SUMMARY_PROVIDER.' }));
    expect(() => parseSummaryEnvironment({ SUMMARY_CONTEXT_CAPACITY: '0' }))
      .toThrowError(expect.objectContaining({ message: 'Configuração inválida: SUMMARY_CONTEXT_CAPACITY.' }));
  });
});
