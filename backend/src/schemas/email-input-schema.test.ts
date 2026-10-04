import { describe, expect, it } from 'vitest';

import { parseEmailInput } from './email-input-schema.js';

describe('parseEmailInput', () => {
  it('accepts a single email field', () => {
    expect(parseEmailInput({ email: 'person@example.test' })).toEqual({ email: 'person@example.test' });
  });

  it.each([null, {}, { email: 42 }, { email: 'person@example.test', extra: true }])(
    'rejects invalid email payload shapes',
    (input) => expect(() => parseEmailInput(input)).toThrow('Informe um e-mail válido.'),
  );
});
