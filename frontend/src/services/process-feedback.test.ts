import { describe, expect, it } from 'vitest';
import type { RequestFailure } from '../types/api';
import { getProcessDetailsError, getProcessInputError, getProcessSearchError, validateProcessCnj } from './process-feedback';

describe('process feedback', () => {
  it('validates empty, strict and complete CNJ structures while preserving zero digits', () => {
    expect(validateProcessCnj('')).toBe('Informe o número do processo.');
    expect(validateProcessCnj('   ')).toBe('Informe o número do processo.');
    expect(validateProcessCnj('00000000000000000000')).toBeNull();
    expect(validateProcessCnj('0000000-00.0000.0.00.0000')).toBeNull();
    expect(validateProcessCnj('0000000 00.0000.0.00.0000')).toContain('Confira o formato');
    expect(validateProcessCnj('0000000000000000000٠')).toContain('Confira o formato');
  });

  it('maps CNJ validation codes to actionable field messages', () => {
    expect(getProcessInputError(failure('CNJ_REQUIRED'))).toBe('Informe o número do processo.');
    expect(getProcessInputError(failure('CNJ_FORMAT_INVALID'))).toContain('20 números');
    expect(getProcessInputError(failure('CNJ_INVALID'))).toContain('não é válido');
    expect(getProcessInputError(null)).toBeNull();
  });

  it('separates absent processes, network failures and service failures', () => {
    expect(getProcessSearchError(failure('PROCESS_NOT_FOUND'), 'x')).toContain('Não encontramos');
    expect(getProcessSearchError(null, 'A solicitação excedeu o tempo limite.')).toContain('concluir');
    expect(getProcessSearchError(null, 'network')).toContain('conectar');
    expect(getProcessSearchError(failure('SERVICE_UNAVAILABLE'), 'x')).toContain('concluir');
    expect(getProcessDetailsError(failure('PROCESS_NOT_FOUND'))).toContain('Não encontramos');
    expect(getProcessDetailsError(null)).toContain('concluir');
  });
});

function failure(code: string): RequestFailure {
  return { status: 404, error: { code, message: 'internal', field: null, retryAfterSeconds: null } };
}
