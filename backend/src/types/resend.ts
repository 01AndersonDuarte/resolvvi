export type DeliveryResult = {
  status: 'accepted' | 'failed' | 'unknown';
  providerMessageId: string | null;
};

export type VerificationEmailInput = {
  emissionId: string;
  email: string;
  confirmationUrl: string;
  expiresAt: Date;
  deadline: Date;
};

export type VerificationSender = {
  send: (input: VerificationEmailInput) => Promise<DeliveryResult>;
};

export type VerificationEmailContent = { html: string; subject: string; text: string };
