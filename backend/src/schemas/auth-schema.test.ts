import { describe, expect, it } from 'vitest';

import { parseLoginInput, parseRegistrationInput } from './auth-schema.js';

describe('parseRegistrationInput', () => {
  it('accepts a syntactically valid email with password and no extra fields', () => {
    expect(parseRegistrationInput({ email: 'example@email.com', password: 'password' }))
      .toEqual({ email: 'example@email.com', password: 'password' });
  });

  it.each([null, {}, { email: 'person@example.test' }, { email: 'person@example.test', password: 'password', role: 'admin' }])(
    'rejects invalid registration payload shapes',
    (input) => expect(() => parseRegistrationInput(input)).toThrow(),
  );
});

describe('parseLoginInput', () => {
  it('preserves the login password exactly as submitted', () => {
    expect(parseLoginInput({ email: 'person@example.test', password: ' pass word ' }))
      .toEqual({ email: 'person@example.test', password: ' pass word ' });
  });

  it.each([null, {}, { email: 'person@example.test' }, { email: 'person@example.test', password: 42 },
    { email: 'person@example.test', password: 'password', extra: true }])(
    'rejects incomplete or additional login fields',
    (input) => expect(() => parseLoginInput(input)).toThrow(),
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
