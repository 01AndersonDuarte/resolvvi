import type { AuthCredentials } from '../types/auth-credentials';

export type CredentialErrors = { email: string | null; password: string | null };
export type CredentialsValidation = { input: AuthCredentials | null; errors: CredentialErrors };
export type EmailValidation = { email: string | null; error: string | null };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MIN_REGISTRATION_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export function validateCredentials(
  email: string,
  password: string,
  mode: 'login' | 'registration',
): CredentialsValidation {
  const emailResult = validateEmail(email);
  const passwordError = getPasswordError(password, mode);
  const errors = { email: emailResult.error, password: passwordError };

  if (emailResult.email === null || passwordError !== null) return { input: null, errors };

  return { input: { email: emailResult.email, password }, errors };
}

export function validateEmail(email: string): EmailValidation {
  const normalizedEmail = email.trim().toLowerCase();
  const valid = normalizedEmail.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(normalizedEmail);

  return valid
    ? { email: normalizedEmail, error: null }
    : { email: null, error: 'Informe um e-mail válido.' };
}

function getPasswordError(password: string, mode: 'login' | 'registration'): string | null {
  if (!hasValidUnicode(password)) return getPasswordPolicyMessage(mode);

  const length = Array.from(password).length;
  if (mode === 'registration' && length < MIN_REGISTRATION_PASSWORD_LENGTH) {
    return getPasswordPolicyMessage(mode);
  }
  if (length === 0 || length > MAX_PASSWORD_LENGTH) return getPasswordPolicyMessage(mode);

  return null;
}

function getPasswordPolicyMessage(mode: 'login' | 'registration'): string {
  return mode === 'registration'
    ? 'Use uma senha de 8 a 128 caracteres.'
    : 'Informe uma senha de até 128 caracteres.';
}

function hasValidUnicode(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return false;
  }

  return true;
}
