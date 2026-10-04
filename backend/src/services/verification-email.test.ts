import { describe, expect, it } from 'vitest';

import { createVerificationEmailContent } from './verification-email.js';

describe('createVerificationEmailContent', () => {
  it('includes purpose, deadline and a copyable escaped link without process or password data', () => {
    const content = createVerificationEmailContent({
      confirmationUrl: 'https://app.example/confirmar-email#token=a&b',
      expiresAt: new Date('2026-10-04T20:00:00.000Z'),
    });

    expect(content.subject).toContain('Confirme');
    expect(content.text).toContain('24 horas');
    expect(content.text).toContain('https://app.example/confirmar-email#token=a&b');
    expect(content.html).toContain('&amp;b');
    expect(content.text).not.toMatch(/senha|\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/i);
  });
});
