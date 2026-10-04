const PRODUCT_NAME = 'Consulta CNJ';
const VALIDITY_HOURS = 24;

export type VerificationEmailContent = { html: string; subject: string; text: string };

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
