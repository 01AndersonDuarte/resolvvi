import type { Movement, Process } from '../generated/prisma/client.js';

export type CreateProcessInput = Pick<
  Process,
  'cnj' | 'forum' | 'court' | 'lawsuitValue' | 'numberOfAuthors'
>;

export type ProcessRepository = {
  create: (input: CreateProcessInput) => Promise<Process>;
  findByCnj: (cnj: string) => Promise<Process | null>;
  findSummaryByCnj: (cnj: string) => Promise<Pick<Process, 'id' | 'cnj'> | null>;
  findSummaryById: (id: number) => Promise<Pick<Process, 'id' | 'cnj'> | null>;
};

export type ProcessSummary = Pick<Process, 'id' | 'cnj'>;
export type CnjInput = { cnj: string };

export type CreateMovementInput = Pick<
  Movement,
  'processId' | 'movementDate' | 'movementTitle' | 'movementContent' | 'sourceOrder'
>;

export type MovementRepository = {
  create: (input: CreateMovementInput) => Promise<Movement>;
  listByProcess: (processId: number) => Promise<Movement[]>;
};
