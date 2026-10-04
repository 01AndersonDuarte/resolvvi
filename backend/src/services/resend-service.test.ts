import { describe, expect, it, vi } from 'vitest';

import { createResendService } from './resend-service.js';

const input = {
  emissionId: 'emission-id',
  email: 'user@example.test',
  confirmationUrl: 'https://app.example/confirmar-email#token=secret',
  expiresAt: new Date('2026-10-04T20:00:00.000Z'),
  deadline: new Date(Date.now() + 8_000),
};

describe('createResendService', resendServiceCases);

function resendServiceCases(): void {
  it('sends a confirmation with backend credentials and emission idempotency', sendsExpectedPayload);
  it.each([
    [400, 'failed'],
    [429, 'failed'],
    [503, 'unknown'],
  ] as const)('classifies provider HTTP %i as %s', classifiesHttpResponse);
  it('classifies transport errors and malformed success bodies as unknown', classifiesUnknownOutcomes);
  it('does not call Resend when the request deadline elapsed', skipsExpiredDeadline);
}

async function sendsExpectedPayload(): Promise<void> {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: 'provider-message-id' }), { status: 200 }),
    );
    const sender = createResendService({ apiKey: 'private-key', from: 'noreply@example.test', fetcher });

    const result = await sender.send(input);
    const request = fetcher.mock.calls[0]?.[1];

    expect(result).toEqual({ status: 'accepted', providerMessageId: 'provider-message-id' });
    expect(request?.headers).toMatchObject({
      Authorization: 'Bearer private-key',
      'Idempotency-Key': 'confirmation/emission-id',
    });
    expect(JSON.stringify(request?.body)).not.toContain('password');
}

async function classifiesHttpResponse(status: number, expected: 'failed' | 'unknown'): Promise<void> {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status }));
  const result = await createResendService({ apiKey: 'key', from: 'noreply@example.test', fetcher }).send(input);

  expect(result).toEqual({ status: expected, providerMessageId: null });
}

async function classifiesUnknownOutcomes(): Promise<void> {
    const failedTransport = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));
    const malformedSuccess = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 200 }));

    await expect(createResendService({ apiKey: 'key', from: 'noreply@example.test', fetcher: failedTransport }).send(input))
      .resolves.toMatchObject({ status: 'unknown' });
    await expect(createResendService({ apiKey: 'key', from: 'noreply@example.test', fetcher: malformedSuccess }).send(input))
      .resolves.toMatchObject({ status: 'unknown' });
}

async function skipsExpiredDeadline(): Promise<void> {
    const fetcher = vi.fn<typeof fetch>();
    const result = await createResendService({ apiKey: 'key', from: 'noreply@example.test', fetcher }).send({
      ...input,
      deadline: new Date(0),
    });

    expect(result).toEqual({ status: 'unknown', providerMessageId: null });
    expect(fetcher).not.toHaveBeenCalled();
}
import { createVerificationEmailContent } from './resend-service.js';

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
