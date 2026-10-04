import Joi from 'joi';

import { invalidInput } from '../errors/application-error.js';

const emailInputSchema = Joi.object({ email: Joi.string().required() }).unknown(false);

export function parseEmailInput(input: unknown): { email: string } {
  const result = emailInputSchema.validate(input, { abortEarly: false, convert: false });
  if (result.error) throw invalidInput('Informe um e-mail válido.', 'email');

  return result.value as { email: string };
}
