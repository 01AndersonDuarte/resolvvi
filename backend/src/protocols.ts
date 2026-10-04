import type {
  EmailVerification,
  Prisma,
  PrismaClient,
  Session,
  User,
} from './generated/prisma/client.js';

export type ApplicationEnvironment = {
  databaseLabel: string;
  databaseUrl: string;
  nodeEnvironment: 'development' | 'production' | 'test';
};

export type HttpEnvironment = {
  port: number;
  publicAppUrl: string;
};

export type LogContext = Record<string, unknown>;

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

export type AuthenticationDatabase = PrismaClient | Prisma.TransactionClient;
