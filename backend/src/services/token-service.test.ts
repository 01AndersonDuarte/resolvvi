import { describe, expect, it } from 'vitest';

import { createSecret, digestSecret, isValidSecret } from './token-service.js';

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
