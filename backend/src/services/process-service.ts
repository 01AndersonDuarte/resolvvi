import { ApplicationError } from '../errors/application-error.js';
import { processNotFound, processServiceUnavailable } from '../errors/process-errors.js';
import type { ProcessRepository, ProcessSummary } from '../types/process.js';
import { normalizeCnjInput } from './cnj-input-service.js';

export type ProcessService = {
  search: (cnj: string) => Promise<ProcessSummary>;
  getById: (id: string) => Promise<ProcessSummary>;
};

export function createProcessService(repository: ProcessRepository): ProcessService {
  return {
    search: (cnj) => searchProcess(cnj, repository),
    getById: (id) => getProcessById(id, repository),
  };
}

async function searchProcess(cnj: string, repository: ProcessRepository): Promise<ProcessSummary> {
  const normalizedCnj = normalizeCnjInput(cnj);
  try {
    const process = await repository.findSummaryByCnj(normalizedCnj);
    if (!process) throw processNotFound();
    return { id: process.id, cnj: process.cnj };
  } catch (error: unknown) {
    if (error instanceof ApplicationError) throw error;
    throw processServiceUnavailable();
  }
}

async function getProcessById(id: string, repository: ProcessRepository): Promise<ProcessSummary> {
  const processId = parseProcessId(id);
  try {
    const process = await repository.findSummaryById(processId);
    if (!process) throw processNotFound();
    return { id: process.id, cnj: process.cnj };
  } catch (error: unknown) {
    if (error instanceof ApplicationError) throw error;
    throw processServiceUnavailable();
  }
}

function parseProcessId(value: string): number {
  if (!/^[1-9][0-9]*$/.test(value)) throw processNotFound();
  const parsedId = Number(value);
  if (!Number.isSafeInteger(parsedId) || parsedId > 2_147_483_647) throw processNotFound();
  return parsedId;
}
