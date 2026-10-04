import type { PrismaClient } from '../generated/prisma/client.js';
import type { Process } from '../generated/prisma/client.js';
import type { CreateProcessInput, ProcessDetailsRecord, ProcessRepository } from '../types/process.js';

export type { CreateProcessInput, ProcessDetailsRecord, ProcessRepository };

export function createProcess(input: CreateProcessInput, client: PrismaClient): Promise<Process> {
  return client.process.create({ data: input });
}

export function findProcessByCnj(cnj: string, client: PrismaClient): Promise<Process | null> {
  return client.process.findUnique({ where: { cnj } });
}

export function findProcessSummaryByCnj(
  cnj: string,
  client: PrismaClient,
): Promise<Pick<Process, 'id' | 'cnj'> | null> {
  return client.process.findUnique({ where: { cnj }, select: { id: true, cnj: true } });
}

export function findProcessById(
  id: number,
  client: PrismaClient,
): Promise<ProcessDetailsRecord | null> {
  return client.process.findUnique({
    where: { id },
    select: { id: true, cnj: true, forum: true, court: true, lawsuitValue: true, numberOfAuthors: true },
  });
}

export function createProcessRepository(client: PrismaClient): ProcessRepository {
  return {
    create: (input) => createProcess(input, client),
    findByCnj: (cnj) => findProcessByCnj(cnj, client),
    findSummaryByCnj: (cnj) => findProcessSummaryByCnj(cnj, client),
    findById: (id) => findProcessById(id, client),
  };
}
