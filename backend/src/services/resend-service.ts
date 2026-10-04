import type { DeliveryResult, VerificationEmailContent, VerificationSender } from '../types/resend.js';

const PRODUCT_NAME = 'Consulta CNJ';
const VALIDITY_HOURS = 24;
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const MAXIMUM_TIMEOUT_MS = 8_000;

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

export function createVerificationEmailContent(input: {
  confirmationUrl: string;
  expiresAt: Date;
}): VerificationEmailContent {
  const expiry = input.expiresAt.toLocaleString('pt-BR', { timeZone: 'UTC', timeZoneName: 'short' });
  const safeUrl = escapeHtml(input.confirmationUrl);
  const text = `${PRODUCT_NAME}: confirme seu e-mail para acessar sua conta. Este link expira em ${VALIDITY_HOURS} horas (${expiry}).\n\n${input.confirmationUrl}`;

  return {
    subject: 'Confirme seu e-mail',
    text,
    html: `<p>${PRODUCT_NAME}: confirme seu e-mail para acessar sua conta.</p><p>Este link expira em ${VALIDITY_HOURS} horas (${expiry}).</p><p><a href="${safeUrl}">Confirmar e-mail</a></p><p>Se preferir, copie este link: ${safeUrl}</p>`,
  };
}

async function classifyResponse(response: Response): Promise<DeliveryResult> {
  if (response.status === 429) return { status: 'failed', providerMessageId: null };
  if (response.status >= 500) return { status: 'unknown', providerMessageId: null };
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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return replacements[character] ?? character;
  });
}
