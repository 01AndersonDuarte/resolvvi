import Joi from 'joi';

import { invalidInput } from '../errors/application-error.js';

const credentialsSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
}).unknown(false);

export type RegistrationInput = { email: string; password: string };

export function parseRegistrationInput(input: unknown): RegistrationInput {
  const result = credentialsSchema.validate(input, { abortEarly: false, convert: false });
  if (result.error) {
    const passwordInvalid = result.error.details.some((detail) => detail.path[0] === 'password');
    throw invalidInput(
      passwordInvalid ? 'Use uma senha de 8 a 128 caracteres.' : 'Informe um e-mail válido.',
      passwordInvalid ? 'password' : 'email',
    );
  }

  return result.value as RegistrationInput;
}
