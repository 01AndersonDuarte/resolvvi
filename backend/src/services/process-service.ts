import { ApplicationError } from '../errors/application-error.js';
import { logger } from '../config/logger.js';
import { processNotFound, processServiceUnavailable } from '../errors/process-errors.js';
import type { ProcessDetails, ProcessDetailsRecord, ProcessRepository, ProcessSummary } from '../types/process.js';
import { normalizeCnjInput } from './cnj-input-service.js';

const DECIMAL_GROUP_PATTERN = /\B(?=(\d{3})+(?!\d))/g;
const MASKED_CNJ_PATTERN = /^[0-9]{7}-[0-9]{2}\.[0-9]{4}\.[0-9]\.[0-9]{2}\.[0-9]{4}$/;

export type ProcessService = {
  search: (cnj: string) => Promise<ProcessSummary>;
  getById: (id: number) => Promise<ProcessDetails>;
};

export function createProcessService(repository: ProcessRepository): ProcessService {
  return {
    search: (cnj) => searchProcess(cnj, repository),
    getById: (id) => getProcessDetails(id, repository),
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

async function getProcessDetails(id: number, repository: ProcessRepository): Promise<ProcessDetails> {
  try {
    const process = await repository.findById(id);
    if (!process) throw processNotFound();
    return serializeProcessDetails(process);
  } catch (error: unknown) {
    if (error instanceof ApplicationError) throw error;
    logProcessDetailsFailure(error);
    throw processServiceUnavailable();
  }
}

function serializeProcessDetails(process: ProcessDetailsRecord): ProcessDetails {
  if (!MASKED_CNJ_PATTERN.test(process.cnj)) throw processServiceUnavailable();

  return {
    id: process.id,
    cnj: process.cnj,
    forum: process.forum,
    court: process.court,
    lawsuitValue: process.lawsuitValue === null ? null : formatDecimal(process.lawsuitValue.toFixed(2)),
    numberOfAuthors: process.numberOfAuthors,
  };
}

function formatDecimal(value: string): string {
  const [integerPart, decimalPart] = value.split('.');
  if (integerPart === undefined || decimalPart === undefined) throw processServiceUnavailable();

  return `${integerPart.replace(DECIMAL_GROUP_PATTERN, '.')},${decimalPart}`;
}

function logProcessDetailsFailure(error: unknown): void {
  const errorType = error instanceof Error ? error.name : typeof error;
  logger.error('Falha ao consultar detalhes processuais', undefined, {
    operation: 'process-details',
    errorType,
  });
}
