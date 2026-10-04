import { createHash, randomBytes } from 'node:crypto';

const SECRET_BYTES = 32;
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createSecret(): string {
  return randomBytes(SECRET_BYTES).toString('base64url');
}

export function isValidSecret(secret: string): boolean {
  if (!SECRET_PATTERN.test(secret)) return false;

  return Buffer.from(secret, 'base64url').toString('base64url') === secret;
}

export function digestSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}
