import Joi from 'joi';

const MAX_EMAIL_LENGTH = 254;

const emailSchema = Joi.string().max(MAX_EMAIL_LENGTH).email().required();

export type EmailValidation =
  | { valid: true; normalizedEmail: string }
  | { valid: false };

export function validateAndNormalizeEmail(email: string): EmailValidation {
  const normalizedEmail = email.trim().toLowerCase();
  const { error } = emailSchema.validate(normalizedEmail, { convert: false });
  if (error) return { valid: false };

  return { valid: true, normalizedEmail };
}
