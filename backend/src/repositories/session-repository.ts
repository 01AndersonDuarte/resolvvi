import type { AuthenticationDatabase, AuthenticationSession } from '../protocols.js';

export type CreateSessionInput = Pick<AuthenticationSession, 'userId' | 'tokenHash' | 'expiresAt'>;

export type SessionRepository = {
  create: (input: CreateSessionInput) => Promise<AuthenticationSession>;
  findByTokenHash: (tokenHash: string) => Promise<AuthenticationSession | null>;
  revokeByTokenHash: (tokenHash: string, revokedAt: Date) => Promise<number>;
};

export function createSessionRepository(client: AuthenticationDatabase): SessionRepository {
  return {
    create: (data) => client.session.create({ data }),
    findByTokenHash: (tokenHash) => client.session.findUnique({ where: { tokenHash } }),
    revokeByTokenHash: async (tokenHash, revokedAt) => {
      const result = await client.session.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt },
      });
      return result.count;
    },
  };
}
