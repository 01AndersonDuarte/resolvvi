import Joi from 'joi';

import { invalidInput } from '../errors/application-error.js';
import type { EmailInput, RegistrationInput } from '../types/auth.js';

const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_CODE_POINTS = 8;
const MAX_PASSWORD_CODE_POINTS = 128;

const emailSchema = Joi.string().max(MAX_EMAIL_LENGTH).email({ tlds: { allow: false } }).required();
const emailInputSchema = Joi.object({ email: Joi.string().required() }).unknown(false);
const credentialsSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
}).unknown(false);

export type EmailValidation =
  | { valid: true; normalizedEmail: string }
  | { valid: false };

export type PasswordValidation = { valid: boolean };

export function parseEmailInput(input: unknown): EmailInput {
  const result = emailInputSchema.validate(input, { abortEarly: false, convert: false });
  if (result.error) throw invalidInput('Informe um e-mail válido.', 'email');

  return result.value as EmailInput;
}

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

export function validateAndNormalizeEmail(email: string): EmailValidation {
  const normalizedEmail = email.trim().toLowerCase();
  const { error } = emailSchema.validate(normalizedEmail, { convert: false });
  if (error) return { valid: false };

  return { valid: true, normalizedEmail };
}

export function validatePassword(password: string): PasswordValidation {
  if (!hasValidUnicode(password)) return { valid: false };

  const codePointLength = Array.from(password).length;
  return {
    valid: codePointLength >= MIN_PASSWORD_CODE_POINTS && codePointLength <= MAX_PASSWORD_CODE_POINTS,
  };
}

function hasValidUnicode(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return false;
  }

  return true;
}
