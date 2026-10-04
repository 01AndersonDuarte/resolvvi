import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const SCRYPT_COST = 131_072;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_MAX_MEMORY_BYTES = 256 * 1024 * 1024;
const SALT_BYTES = 16;
const DERIVED_KEY_BYTES = 64;
const HASH_VERSION = 'scrypt$v1';
const HASH_PATTERN = /^scrypt\$v1\$131072\$8\$1\$[a-f\d]{32}\$[a-f\d]{128}$/;
const SECRET_BYTES = 32;
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MAX_ACTIVE_DERIVATIONS = 2;
const MAX_QUEUED_DERIVATIONS = 16;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const passwordWorkQueue = createPasswordWorkQueue();

type WaitingJob = {
  resolve: () => void;
  timer: NodeJS.Timeout;
};

type PasswordWorkQueue = {
  run<T>(operation: () => Promise<T>, deadlineAt?: number): Promise<T>;
};

export class PasswordWorkloadError extends Error {
  constructor() {
    super('A autenticação está temporariamente indisponível. Tente novamente.');
    this.name = 'PasswordWorkloadError';
  }
}

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

export function createPasswordWorkQueue(): PasswordWorkQueue {
  let activeDerivations = 0;
  const waitingJobs: WaitingJob[] = [];

  async function run<T>(operation: () => Promise<T>, deadlineAt = Date.now() + DEFAULT_REQUEST_TIMEOUT_MS): Promise<T> {
    if (activeDerivations >= MAX_ACTIVE_DERIVATIONS) await waitForCapacity(waitingJobs, deadlineAt);

    activeDerivations += 1;
    try {
      return await operation();
    } finally {
      activeDerivations -= 1;
      waitingJobs.shift()?.resolve();
    }
  }

  return { run };
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

function waitForCapacity(jobs: WaitingJob[], deadlineAt: number): Promise<void> {
  if (jobs.length >= MAX_QUEUED_DERIVATIONS) return Promise.reject(new PasswordWorkloadError());

  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) return Promise.reject(new PasswordWorkloadError());

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const index = jobs.findIndex((job) => job.timer === timer);
      if (index !== -1) jobs.splice(index, 1);
      reject(new PasswordWorkloadError());
    }, remainingMs);
    jobs.push({
      resolve: () => {
        clearTimeout(timer);
        resolve();
      },
      timer,
    });
  });
}
