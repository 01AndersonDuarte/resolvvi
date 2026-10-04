import type { PrismaClient } from '../generated/prisma/client.js';
import type { Process } from '../generated/prisma/client.js';
import type { CreateProcessInput, ProcessRepository } from '../types/process.js';

export type { CreateProcessInput, ProcessRepository };

export function createProcess(input: CreateProcessInput, client: PrismaClient): Promise<Process> {
  return client.process.create({ data: input });
}

export function findProcessByCnj(cnj: string, client: PrismaClient): Promise<Process | null> {
  return client.process.findUnique({ where: { cnj } });
}

export function createProcessRepository(client: PrismaClient): ProcessRepository {
  return {
    create: (input) => createProcess(input, client),
    findByCnj: (cnj) => findProcessByCnj(cnj, client),
  };
}
