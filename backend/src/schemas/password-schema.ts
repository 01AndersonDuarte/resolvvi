const MIN_PASSWORD_CODE_POINTS = 8;
const MAX_PASSWORD_CODE_POINTS = 128;

export type PasswordValidation = { valid: boolean };

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
