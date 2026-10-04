import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

import { createPasswordWorkQueue } from './password-work-queue.js';

const SCRYPT_COST = 131_072;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_MAX_MEMORY_BYTES = 256 * 1024 * 1024;
const SALT_BYTES = 16;
const DERIVED_KEY_BYTES = 64;
const HASH_VERSION = 'scrypt$v1';
const HASH_PATTERN = /^scrypt\$v1\$131072\$8\$1\$[a-f\d]{32}\$[a-f\d]{128}$/;
const passwordWorkQueue = createPasswordWorkQueue();

export async function hashPassword(password: string, deadlineAt?: number): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derivedKey = await passwordWorkQueue.run(() => deriveKey(password, salt), deadlineAt);

  return HASH_VERSION + '$131072$8$1$' + salt.toString('hex') + '$' + derivedKey.toString('hex');
}

export async function createDummyPasswordHash(deadlineAt?: number): Promise<string> {
  const dummyPassword = randomBytes(32).toString('base64url');
  return hashPassword(dummyPassword, deadlineAt);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
  deadlineAt?: number,
): Promise<boolean> {
  const parsedHash = parsePasswordHash(passwordHash);
  if (!parsedHash) return false;

  const derivedKey = await passwordWorkQueue.run(
    () => deriveKey(password, parsedHash.salt),
    deadlineAt,
  );

  return timingSafeEqual(derivedKey, parsedHash.derivedKey);
}

function parsePasswordHash(passwordHash: string): { salt: Buffer; derivedKey: Buffer } | undefined {
  if (!HASH_PATTERN.test(passwordHash)) return undefined;

  const fields = passwordHash.split('$');
  const salt = Buffer.from(fields[5] ?? '', 'hex');
  const derivedKey = Buffer.from(fields[6] ?? '', 'hex');
  if (salt.length !== SALT_BYTES || derivedKey.length !== DERIVED_KEY_BYTES) return undefined;

  return { salt, derivedKey };
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      DERIVED_KEY_BYTES,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: SCRYPT_MAX_MEMORY_BYTES,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}
