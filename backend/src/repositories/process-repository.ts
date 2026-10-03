import type { PrismaClient, Process } from '../generated/prisma/client.js';

export type CreateProcessInput = Pick<
  Process,
  'cnj' | 'forum' | 'court' | 'lawsuitValue' | 'numberOfAuthors'
>;

export type ProcessRepository = {
  create: (input: CreateProcessInput) => Promise<Process>;
  findByCnj: (cnj: string) => Promise<Process | null>;
};

export function createProcessRepository(client: PrismaClient): ProcessRepository {
  return {
    create: (input) => client.process.create({ data: input }),
    findByCnj: (cnj) => client.process.findUnique({ where: { cnj } }),
  };
}
