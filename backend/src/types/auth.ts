import type { Session, User } from '../generated/prisma/client.js';

export type AuthenticationUser = Pick<User, 'id' | 'email' | 'passwordHash' | 'createdAt'>;
export type AuthenticationSession = Pick<Session, 'id' | 'userId' | 'tokenHash' | 'createdAt' | 'expiresAt' | 'revokedAt'>;
export type CreateUserInput = Pick<AuthenticationUser, 'email' | 'passwordHash'>;
export type CreateSessionInput = Pick<AuthenticationSession, 'userId' | 'tokenHash' | 'expiresAt'>;
export type RegistrationInput = { email: string; password: string };
export type MessageResponse = { message: string };
export type CredentialsInput = RegistrationInput;
export type SessionResponse = { sessionId: string; expiresAt: string; serverTime: string };
export type SessionContext = SessionResponse & { userId: string };
export type SessionGrant = SessionContext & { secret: string };
export type LoginInput = CredentialsInput;

export type AuthRepository = {
  createUser: (input: CreateUserInput) => Promise<AuthenticationUser>;
  findUserByEmail: (email: string) => Promise<AuthenticationUser | null>;
  findUserById: (id: string) => Promise<AuthenticationUser | null>;
  createSession: (input: CreateSessionInput) => Promise<AuthenticationSession>;
  replaceSession: (input: CreateSessionInput, previousTokenHash: string | null, revokedAt: Date) => Promise<AuthenticationSession>;
  findSessionByTokenHash: (tokenHash: string) => Promise<AuthenticationSession | null>;
  findValidSessionByTokenHash: (tokenHash: string, now: Date) => Promise<(AuthenticationSession & { user: AuthenticationUser }) | null>;
  findValidSessionById: (sessionId: string, now: Date) => Promise<AuthenticationSession | null>;
  revokeSessionByTokenHash: (tokenHash: string, revokedAt: Date) => Promise<number>;
};

export type AuthService = {
  register: (input: RegistrationInput) => Promise<MessageResponse>;
  login: (input: LoginInput, previousSecret?: string | null) => Promise<SessionGrant>;
  getSession: (secret: string | null) => Promise<SessionContext>;
  getSessionById: (sessionId: string) => Promise<SessionContext>;
  logout: (secret: string | null) => Promise<void>;
};

export type AuthServiceDependencies = {
  repositories: AuthRepository;
  now?: () => Date;
};
