import type { PrismaClient, Session, User } from '../generated/prisma/client.js';
import type { AuthRepository, CreateSessionInput, CreateUserInput } from '../types/auth.js';
import type { AuthenticationDatabase } from '../types/database.js';

export function createUser(input: CreateUserInput, client: AuthenticationDatabase): Promise<User> {
  return client.user.create({ data: input });
}

export function findUserByEmail(email: string, client: AuthenticationDatabase): Promise<User | null> {
  return client.user.findUnique({ where: { email } });
}

export function findUserById(id: string, client: AuthenticationDatabase): Promise<User | null> {
  return client.user.findUnique({ where: { id } });
}

export function createSession(input: CreateSessionInput, client: AuthenticationDatabase): Promise<Session> {
  return client.session.create({ data: input });
}

export async function replaceSession(
  input: { session: CreateSessionInput; previousTokenHash: string | null; revokedAt: Date },
  client: AuthenticationDatabase,
): Promise<Session> {
  if (!('$transaction' in client)) throw new Error('Session replacement requires PrismaClient.');
  return (client as PrismaClient).$transaction(async (transaction) => {
    if (input.previousTokenHash) {
      await transaction.session.updateMany({
        where: { tokenHash: input.previousTokenHash, revokedAt: null }, data: { revokedAt: input.revokedAt },
      });
    }
    return transaction.session.create({ data: input.session });
  }, { maxWait: 2_000, timeout: 3_000 });
}

export function findSessionByTokenHash(tokenHash: string, client: AuthenticationDatabase): Promise<Session | null> {
  return client.session.findUnique({ where: { tokenHash } });
}

export async function findValidSessionByTokenHash(
  tokenHash: string,
  now: Date,
  client: AuthenticationDatabase,
): Promise<(Session & { user: User }) | null> {
  const session = await client.session.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= now) return null;
  return session;
}

export async function revokeSessionByTokenHash(
  tokenHash: string,
  revokedAt: Date,
  client: AuthenticationDatabase,
): Promise<number> {
  const result = await client.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt } });
  return result.count;
}

export function createAuthRepository(client: AuthenticationDatabase): AuthRepository {
  return {
    createUser: (input) => createUser(input, client),
    findUserByEmail: (email) => findUserByEmail(email, client),
    findUserById: (id) => findUserById(id, client),
    createSession: (input) => createSession(input, client),
    replaceSession: (session, previousTokenHash, revokedAt) =>
      replaceSession({ session, previousTokenHash, revokedAt }, client),
    findSessionByTokenHash: (tokenHash) => findSessionByTokenHash(tokenHash, client),
    findValidSessionByTokenHash: (tokenHash, now) => findValidSessionByTokenHash(tokenHash, now, client),
    revokeSessionByTokenHash: (tokenHash, revokedAt) => revokeSessionByTokenHash(tokenHash, revokedAt, client),
  };
}
