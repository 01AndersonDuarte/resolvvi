import { describe, expect, it } from 'vitest';

import { parseEmailInput } from './auth-schema.js';

describe('parseEmailInput', () => {
  it('accepts a single email field', () => {
    expect(parseEmailInput({ email: 'person@example.test' })).toEqual({ email: 'person@example.test' });
  });

  it.each([null, {}, { email: 42 }, { email: 'person@example.test', extra: true }])(
    'rejects invalid email payload shapes',
    (input) => expect(() => parseEmailInput(input)).toThrow('Informe um e-mail válido.'),
  );
});
import { validateAndNormalizeEmail } from './auth-schema.js';

describe('validateAndNormalizeEmail', () => {
  it('normalizes outer spaces and letter case', () => {
    expect(validateAndNormalizeEmail('  Person+tag@Example.COM ')).toEqual({
      valid: true,
      normalizedEmail: 'person+tag@example.com',
    });
  });

  it('does not change dots or plus aliases', () => {
    expect(validateAndNormalizeEmail('First.Last+tag@example.com')).toEqual({
      valid: true,
      normalizedEmail: 'first.last+tag@example.com',
    });
  });

  it('rejects malformed and overlong addresses', () => {
    expect(validateAndNormalizeEmail('invalid')).toEqual({ valid: false });
    expect(validateAndNormalizeEmail(`${'a'.repeat(245)}@example.com`)).toEqual({ valid: false });
  });
});
import { validatePassword } from './auth-schema.js';

describe('validatePassword', () => {
  it('accepts 8 through 128 Unicode code points without trimming or normalization', () => {
    expect(validatePassword('        ').valid).toBe(true);
    expect(validatePassword('🔐'.repeat(8)).valid).toBe(true);
    expect(validatePassword('é'.repeat(128)).valid).toBe(true);
  });

  it('rejects passwords outside the code point limits', () => {
    expect(validatePassword('a'.repeat(7)).valid).toBe(false);
    expect(validatePassword('a'.repeat(129)).valid).toBe(false);
  });

  it('rejects unpaired Unicode surrogates', () => {
    expect(validatePassword('validpwd\ud800').valid).toBe(false);
  });
});
import { parseRegistrationInput } from './auth-schema.js';

describe('parseRegistrationInput', () => {
  it('accepts only the email and password fields', () => {
    expect(() => parseRegistrationInput({ email: 'a@b.test', password: 'password', role: 'admin' }))
      .toThrow('Informe um e-mail válido.');
  });

  it.each([null, {}, { email: 'a@b.test' }, { email: 1, password: 'password' }])(
    'rejects invalid credential shapes',
    (input) => expect(() => parseRegistrationInput(input)).toThrow(),
  );

  it('preserves the submitted credential values', () => {
    expect(parseRegistrationInput({ email: ' A@B.test ', password: ' pass word ' }))
      .toEqual({ email: ' A@B.test ', password: ' pass word ' });
  });
});
