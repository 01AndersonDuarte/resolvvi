import { describe, expect, it } from 'vitest';

import { readSessionSecret } from './session-cookie.js';

describe('readSessionSecret', () => {
  it('extracts only the configured cookie among multiple cookies', () => {
    expect(readSessionSecret('theme=dark; session=secret-value; other=value', 'session')).toBe('secret-value');
  });

  it('returns null when the header or configured cookie is absent', () => {
    expect(readSessionSecret(undefined, 'session')).toBeNull();
    expect(readSessionSecret('session-extra=value', 'session')).toBeNull();
  });
});
