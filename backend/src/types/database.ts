import type { Prisma, PrismaClient } from '../generated/prisma/client.js';

export type AuthenticationDatabase = PrismaClient | Prisma.TransactionClient;
export type ProcessDatabase = PrismaClient;
