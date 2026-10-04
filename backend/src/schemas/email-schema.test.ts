import { describe, expect, it } from 'vitest';

import { validateAndNormalizeEmail } from './email-schema.js';

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
