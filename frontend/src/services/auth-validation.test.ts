import { describe, expect, it } from 'vitest';
import { validateCredentials, validateEmail } from './auth-validation';

describe('auth e-mail validation', () => {
  it('normalizes only external whitespace and letter casing', () => {
    expect(validateEmail('  Pessoa.Teste+aceite@EXAMPLE.com  ')).toEqual({
      email: 'pessoa.teste+aceite@example.com',
      error: null,
    });
  });

  it.each([
    '',
    '   ',
    'sem-arroba.example.com',
    'pessoa@',
    'pessoa @example.com',
    `${'a'.repeat(243)}@example.com`,
  ])('rejects the invalid e-mail %j', (email) => {
    expect(validateEmail(email)).toEqual({
      email: null,
      error: 'Informe um e-mail válido.',
    });
  });
});

describe('registration credential validation', () => {
  it.each([
    { length: 7, valid: false },
    { length: 8, valid: true },
    { length: 128, valid: true },
    { length: 129, valid: false },
  ])('handles the $length code point password boundary', ({ length, valid }) => {
    const result = validateCredentials('pessoa@example.com', 'a'.repeat(length), 'registration');

    expect(result.input !== null).toBe(valid);
    expect(result.errors.password).toBe(valid ? null : 'Use uma senha de 8 a 128 caracteres.');
  });

  it('counts multibyte characters as Unicode code points', () => {
    const password = '🙂'.repeat(8);

    expect(password.length).toBe(16);
    expect(validateCredentials('pessoa@example.com', password, 'registration').input).toEqual({
      email: 'pessoa@example.com',
      password,
    });
  });

  it('preserves spaces and Unicode content in an accepted password', () => {
    const password = '  senha🙂  ';

    expect(validateCredentials('pessoa@example.com', password, 'registration').input?.password)
      .toBe(password);
  });

  it('rejects an unpaired surrogate without changing the password', () => {
    const password = `abcdefg\ud800`;
    const result = validateCredentials('pessoa@example.com', password, 'registration');

    expect(result.input).toBeNull();
    expect(result.errors.password).toBe('Use uma senha de 8 a 128 caracteres.');
  });
});

describe('login credential validation', () => {
  it('accepts a non-empty password shorter than the registration minimum', () => {
    const result = validateCredentials(' Pessoa@Example.com ', '1234567', 'login');

    expect(result).toEqual({
      input: { email: 'pessoa@example.com', password: '1234567' },
      errors: { email: null, password: null },
    });
  });

  it.each([
    { password: '', valid: false },
    { password: 'a'.repeat(128), valid: true },
    { password: 'a'.repeat(129), valid: false },
  ])('enforces login presence and maximum length', ({ password, valid }) => {
    const result = validateCredentials('pessoa@example.com', password, 'login');

    expect(result.input !== null).toBe(valid);
    expect(result.errors.password === null).toBe(valid);
  });

  it('reports e-mail and password failures together', () => {
    expect(validateCredentials('inválido', '', 'login')).toEqual({
      input: null,
      errors: {
        email: 'Informe um e-mail válido.',
        password: 'Informe uma senha de até 128 caracteres.',
      },
    });
  });
});
