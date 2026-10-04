import { describe, expect, it } from 'vitest';

import { createDummyPasswordHash, hashPassword, verifyPassword } from './password-service.js';

describe('password service', () => {
  it('stores different salted digests and verifies the exact password', async () => {
    const password = '  🔐secure password  ';
    const firstHash = await hashPassword(password);
    const secondHash = await hashPassword(password);

    expect(firstHash).not.toBe(secondHash);
    await expect(verifyPassword(password, firstHash)).resolves.toBe(true);
    await expect(verifyPassword(password.trim(), firstHash)).resolves.toBe(false);
    await expect(verifyPassword('different password', firstHash)).resolves.toBe(false);
  });

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
