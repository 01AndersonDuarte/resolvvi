import { createVerificationEmailContent } from './verification-email.js';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const MAXIMUM_TIMEOUT_MS = 8_000;

export type VerificationEmailInput = {
  emissionId: string;
  email: string;
  confirmationUrl: string;
  expiresAt: Date;
  deadline: Date;
};

export type DeliveryResult = {
  status: 'accepted' | 'failed' | 'unknown';
  providerMessageId: string | null;
};

export type VerificationSender = {
  send: (input: VerificationEmailInput) => Promise<DeliveryResult>;
};

export function createResendService(configuration: {
  apiKey: string;
  from: string;
  fetcher?: typeof fetch;
}): VerificationSender {
  const fetcher = configuration.fetcher ?? fetch;

  return {
    send: async (input) => {
      const timeoutMs = Math.min(MAXIMUM_TIMEOUT_MS, input.deadline.getTime() - Date.now());
      if (timeoutMs <= 0) return { status: 'unknown', providerMessageId: null };

      const content = createVerificationEmailContent(input);
      try {
        const response = await fetcher(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${configuration.apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `confirmation/${input.emissionId}`,
          },
          body: JSON.stringify({ from: configuration.from, to: [input.email], ...content }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        return await classifyResponse(response);
      } catch {
        return { status: 'unknown', providerMessageId: null };
      }
    },
  };
}

async function classifyResponse(response: Response): Promise<DeliveryResult> {
  if (response.status === 429) return { status: 'failed', providerMessageId: null };
  if (response.status >= 500) {
    return { status: 'unknown', providerMessageId: null };
  }
  if (!response.ok) return { status: 'failed', providerMessageId: null };

  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'id' in body && typeof body.id === 'string') {
      return { status: 'accepted', providerMessageId: body.id };
    }
  } catch {
    return { status: 'unknown', providerMessageId: null };
  }

  return { status: 'unknown', providerMessageId: null };
}
