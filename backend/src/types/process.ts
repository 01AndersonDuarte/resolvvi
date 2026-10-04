import type { Movement, Process } from '../generated/prisma/client.js';

export type CreateProcessInput = Pick<
  Process,
  'cnj' | 'forum' | 'court' | 'lawsuitValue' | 'numberOfAuthors'
>;

export type ProcessRepository = {
  create: (input: CreateProcessInput) => Promise<Process>;
  findByCnj: (cnj: string) => Promise<Process | null>;
  findSummaryByCnj: (cnj: string) => Promise<Pick<Process, 'id' | 'cnj'> | null>;
  findById: (id: number) => Promise<ProcessDetailsRecord | null>;
};

export type MovementPageQuery = { processId: number; page: number };
export type MovementPageRequest = { id: string; query: unknown };
export type MovementItem = {
  id: number;
  movementDate: string | null;
  movementTitle: string | null;
  movementContent: string | null;
};
export type MovementPage = {
  processId: number;
  items: MovementItem[];
  page: number;
  pageSize: 20;
  total: number;
  totalPages: number;
};

export type ProcessSummary = Pick<Process, 'id' | 'cnj'>;
export type ProcessDetailsRecord = Pick<Process, 'id' | 'cnj'> & {
  forum: string | null;
  court: string | null;
  lawsuitValue: Process['lawsuitValue'] | null;
  numberOfAuthors: number | null;
};
export type ProcessDetails = {
  id: number;
  cnj: string;
  forum: string | null;
  court: string | null;
  lawsuitValue: string | null;
  numberOfAuthors: number | null;
};
export type CnjInput = { cnj: string };

export type CreateMovementInput = Pick<
  Movement,
  'processId' | 'movementDate' | 'movementTitle' | 'movementContent' | 'sourceOrder'
>;

export type MovementRepository = {
  create: (input: CreateMovementInput) => Promise<Movement>;
  listByProcess: (processId: number) => Promise<Movement[]>;
  countByProcess: (processId: number) => Promise<number>;
  listPageByProcess: (input: MovementPageQuery) => Promise<Movement[]>;
};
