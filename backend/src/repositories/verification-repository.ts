import type { AuthenticationDatabase, VerificationEmission } from '../protocols.js';

export type CreateVerificationInput = Pick<
  VerificationEmission,
  'userId' | 'tokenHash' | 'expiresAt'
>;

export type VerificationRepository = {
  create: (input: CreateVerificationInput) => Promise<VerificationEmission>;
  findByTokenHash: (tokenHash: string) => Promise<VerificationEmission | null>;
  invalidateActiveForUser: (userId: string, invalidatedAt: Date) => Promise<number>;
  updateDelivery: (id: string, status: 'ACCEPTED' | 'FAILED', providerMessageId: string | null) => Promise<VerificationEmission>;
};

export function createVerificationRepository(client: AuthenticationDatabase): VerificationRepository {
  return {
    create: (data) => client.emailVerification.create({ data }),
    findByTokenHash: (tokenHash) => client.emailVerification.findUnique({ where: { tokenHash } }),
    invalidateActiveForUser: async (userId, invalidatedAt) => {
      const result = await client.emailVerification.updateMany({
        where: { userId, consumedAt: null, invalidatedAt: null },
        data: { invalidatedAt },
      });
      return result.count;
    },
    updateDelivery: (id, deliveryStatus, providerMessageId) =>
      client.emailVerification.update({
        where: { id },
        data: { deliveryStatus, providerMessageId },
      }),
  };
}
