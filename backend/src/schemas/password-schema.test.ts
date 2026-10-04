import { describe, expect, it } from 'vitest';

import { validatePassword } from './password-schema.js';

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
