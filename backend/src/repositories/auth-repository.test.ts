import { describe, expect, it } from 'vitest';

import { getEmissionRetryAfter } from './auth-repository.js';

const now = new Date('2026-10-03T20:00:00.000Z');

describe('getEmissionRetryAfter', () => {
  it('waits one second when the minimum interval has not elapsed', () => {
    expect(getEmissionRetryAfter(emissionsAt([59_999]), now)).toBe(1);
  });

  it('allows another emission at exactly sixty seconds when a window slot is available', () => {
    expect(getEmissionRetryAfter(emissionsAt([60_000]), now)).toBe(0);
  });

  it('waits until the oldest emission leaves the rolling hour after five emissions', () => {
    expect(getEmissionRetryAfter(emissionsAt([3_000_000, 2_400_000, 1_800_000, 1_200_000, 61_000]), now))
      .toBe(600);
  });

  it('allows a slot when the oldest emission reaches the one-hour boundary', () => {
    expect(getEmissionRetryAfter(emissionsAt([3_600_000, 2_400_000, 1_800_000, 1_200_000, 61_000]), now))
      .toBe(0);
  });
});

function emissionsAt(agesInMilliseconds: number[]): { issuedAt: Date }[] {
  return agesInMilliseconds.map((age) => ({ issuedAt: new Date(now.getTime() - age) }));
}
