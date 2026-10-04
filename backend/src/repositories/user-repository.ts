import type { AuthenticationDatabase, AuthenticationUser } from '../protocols.js';

export type CreateUserInput = Pick<AuthenticationUser, 'email' | 'passwordHash'>;

export type UserRepository = {
  create: (input: CreateUserInput) => Promise<AuthenticationUser>;
  findByEmail: (email: string) => Promise<AuthenticationUser | null>;
  findById: (id: string) => Promise<AuthenticationUser | null>;
  markEmailVerified: (id: string, verifiedAt: Date) => Promise<AuthenticationUser>;
};

export function createUserRepository(client: AuthenticationDatabase): UserRepository {
  return {
    create: (data) => client.user.create({ data }),
    findByEmail: (email) => client.user.findUnique({ where: { email } }),
    findById: (id) => client.user.findUnique({ where: { id } }),
    markEmailVerified: (id, emailVerifiedAt) =>
      client.user.update({ where: { id }, data: { emailVerifiedAt } }),
  };
}
