import type { EmailVerification, Session, User } from '../generated/prisma/client.js';
import type { VerificationSender } from './resend.js';

export type AuthenticationUser = Pick<
  User,
  'id' | 'email' | 'passwordHash' | 'emailVerifiedAt' | 'createdAt'
>;

export type AuthenticationSession = Pick<
  Session,
  'id' | 'userId' | 'tokenHash' | 'createdAt' | 'expiresAt' | 'revokedAt'
>;

export type VerificationEmission = Pick<
  EmailVerification,
  | 'id'
  | 'userId'
  | 'tokenHash'
  | 'issuedAt'
  | 'expiresAt'
  | 'consumedAt'
  | 'invalidatedAt'
  | 'deliveryStatus'
  | 'providerMessageId'
>;

export type CreateUserInput = Pick<AuthenticationUser, 'email' | 'passwordHash'>;
export type CreateSessionInput = Pick<AuthenticationSession, 'userId' | 'tokenHash' | 'expiresAt'>;
export type CreateVerificationInput = Pick<VerificationEmission, 'userId' | 'tokenHash' | 'expiresAt'>;
export type RegistrationInput = { email: string; password: string };
export type EmailInput = { email: string };
export type ConfirmationInput = { token: string };
export type MessageResponse = { message: string };

export type EmissionReservation =
  | { status: 'reserved'; emission: VerificationEmission }
  | { status: 'confirmed' }
  | { status: 'limited'; retryAfterSeconds: number };

export type AuthRepository = {
  createUser: (input: CreateUserInput) => Promise<AuthenticationUser>;
  findUserByEmail: (email: string) => Promise<AuthenticationUser | null>;
  findUserById: (id: string) => Promise<AuthenticationUser | null>;
  markEmailVerified: (id: string, verifiedAt: Date) => Promise<AuthenticationUser>;
  createSession: (input: CreateSessionInput) => Promise<AuthenticationSession>;
  findSessionByTokenHash: (tokenHash: string) => Promise<AuthenticationSession | null>;
  revokeSessionByTokenHash: (tokenHash: string, revokedAt: Date) => Promise<number>;
  createVerification: (input: CreateVerificationInput) => Promise<VerificationEmission>;
  findVerificationByTokenHash: (tokenHash: string) => Promise<VerificationEmission | null>;
  invalidateActiveVerifications: (userId: string, invalidatedAt: Date) => Promise<number>;
  updateVerificationDelivery: (
    id: string,
    status: 'ACCEPTED' | 'FAILED',
    providerMessageId: string | null,
  ) => Promise<VerificationEmission>;
  reserveVerification: (input: { userId: string; tokenHash: string }) => Promise<EmissionReservation>;
};

export type AuthService = {
  register: (input: RegistrationInput) => Promise<MessageResponse>;
  resend: (input: EmailInput) => Promise<MessageResponse>;
};

export type AuthServiceDependencies = {
  publicAppUrl: string;
  repositories: AuthRepository;
  sender: VerificationSender;
  now?: () => Date;
};
