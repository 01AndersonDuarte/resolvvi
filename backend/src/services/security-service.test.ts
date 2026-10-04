import { describe, expect, it } from 'vitest';

import { createDummyPasswordHash, hashPassword, verifyPassword } from './security-service.js';

const PASSWORD_HASH_TEST_TIMEOUT_MS = 15_000;

describe('password service', () => {
  it('stores different salted digests and verifies the exact password', async () => {
    const password = '  🔐secure password  ';
    const firstHash = await hashPassword(password);
    const secondHash = await hashPassword(password);

    expect(firstHash).not.toBe(secondHash);
    await expect(verifyPassword(password, firstHash)).resolves.toBe(true);
    await expect(verifyPassword(password.trim(), firstHash)).resolves.toBe(false);
    await expect(verifyPassword('different password', firstHash)).resolves.toBe(false);
  }, PASSWORD_HASH_TEST_TIMEOUT_MS);

  it('rejects malformed or unsupported hash encodings without deriving a key', async () => {
    await expect(verifyPassword('password', 'sha256$deadbeef')).resolves.toBe(false);
    await expect(verifyPassword('password', 'scrypt$v2$131072$8$1$' + 'a'.repeat(32) + '$' + 'b'.repeat(128)))
      .resolves.toBe(false);
  });

  it('creates a same-cost dummy hash for unknown account verification', async () => {
    const dummyHash = await createDummyPasswordHash();

    expect(dummyHash.startsWith('scrypt$v1$131072$8$1$')).toBe(true);
    await expect(verifyPassword('submitted password', dummyHash)).resolves.toBe(false);
  });
});
import { PasswordWorkloadError, createPasswordWorkQueue } from './security-service.js';

describe('password work queue capacity', () => {
  it('rejects work beyond two active derivations and sixteen queued jobs', async () => {
    const queue = createPasswordWorkQueue();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const jobs = Array.from({ length: 18 }, () => queue.run(() => gate));

    await expect(queue.run(() => Promise.resolve(undefined))).rejects.toBeInstanceOf(PasswordWorkloadError);
    release?.();
    await Promise.all(jobs);
  });

});

describe('password work queue deadlines', () => {
  it('rejects queued work after its deadline', async () => {
    const queue = createPasswordWorkQueue();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const active = queue.run(() => gate);
    const secondActive = queue.run(() => gate);
    const queued = queue.run(() => Promise.resolve(undefined), Date.now() - 1);

    await expect(queued).rejects.toBeInstanceOf(PasswordWorkloadError);
    release?.();
    await Promise.all([active, secondActive]);
  });

  it('removes work from the queue when its deadline elapses', async () => {
    const queue = createPasswordWorkQueue();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const active = [queue.run(() => gate), queue.run(() => gate)];
    const queued = queue.run(() => Promise.resolve(undefined), Date.now() + 5);

    await expect(queued).rejects.toBeInstanceOf(PasswordWorkloadError);
    release?.();
    await Promise.all(active);
  });
});
import { createSecret, digestSecret, isValidSecret } from './security-service.js';

describe('token service', () => {
  it('creates independent canonical 32-byte secrets and stores only fixed-size digests', () => {
    const firstSecret = createSecret();
    const secondSecret = createSecret();

    expect(firstSecret).not.toBe(secondSecret);
    expect(isValidSecret(firstSecret)).toBe(true);
    expect(isValidSecret(secondSecret)).toBe(true);
    expect(digestSecret(firstSecret)).toMatch(/^[a-f\d]{64}$/);
    expect(digestSecret(firstSecret)).not.toContain(firstSecret);
  });

  it('rejects malformed and non-canonical secrets', () => {
    expect(isValidSecret('not-a-token')).toBe(false);
    expect(isValidSecret('A'.repeat(42) + 'B')).toBe(false);
  });
});
