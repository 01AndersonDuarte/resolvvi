import { describe, expect, it } from 'vitest';

import { parseRegistrationInput } from './registration-schema.js';

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
