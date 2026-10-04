import { ApplicationError } from '../errors/application-error.js';
import { logger } from '../config/logger.js';
import { movementPageInvalid, processNotFound, processServiceUnavailable } from '../errors/process-errors.js';
import type {
  MovementPage,
  MovementPageRequest,
  ProcessDetails,
  ProcessDetailsRecord,
  ProcessRepository,
  ProcessSummary,
  MovementRepository,
  MovementItem,
} from '../types/process.js';
import { normalizeCnjInput } from './cnj-input-service.js';
import { parseMovementPageRequest } from '../schemas/process-schema.js';

const DECIMAL_GROUP_PATTERN = /\B(?=(\d{3})+(?!\d))/g;
const MASKED_CNJ_PATTERN = /^[0-9]{7}-[0-9]{2}\.[0-9]{4}\.[0-9]\.[0-9]{2}\.[0-9]{4}$/;

export type ProcessService = {
  search: (cnj: string) => Promise<ProcessSummary>;
  getById: (id: number) => Promise<ProcessDetails>;
  listMovements: (input: MovementPageRequest) => Promise<MovementPage>;
};

const MOVEMENT_PAGE_SIZE = 20 as const;

export function createProcessService(
  repository: ProcessRepository,
  movementRepository: MovementRepository,
): ProcessService {
  return {
    search: (cnj) => searchProcess(cnj, repository),
    getById: (id) => getProcessDetails(id, repository),
    listMovements: (input) => getProcessMovements(input, repository, movementRepository),
  };
}

async function getProcessMovements(
  input: MovementPageRequest,
  processRepository: ProcessRepository,
  movementRepository: MovementRepository,
): Promise<MovementPage> {
  const { id, page } = parseMovementPageRequest(input);
  try {
    const process = await processRepository.findById(id);
    if (!process) throw processNotFound();

    const total = await movementRepository.countByProcess(id);
    const totalPages = Math.ceil(total / MOVEMENT_PAGE_SIZE);
    if (page > Math.max(totalPages, 1)) throw movementPageInvalid();
    const records = await movementRepository.listPageByProcess({ processId: id, page });

    return {
      processId: id,
      items: records.map(serializeMovement),
      page,
      pageSize: MOVEMENT_PAGE_SIZE,
      total,
      totalPages,
    };
  } catch (error: unknown) {
    if (error instanceof ApplicationError) throw error;
    logMovementFailure(error);
    throw processServiceUnavailable();
  }
}

function serializeMovement(record: Awaited<ReturnType<MovementRepository['listPageByProcess']>>[number]): MovementItem {
  return {
    id: record.id,
    movementDate: formatCivilDate(record.movementDate),
    movementTitle: normalizeMovementText(record.movementTitle),
    movementContent: normalizeMovementText(record.movementContent),
  };
}

function formatCivilDate(date: Date | null): string | null {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

function normalizeMovementText(value: string | null | undefined): string | null {
  return value === null || value === undefined || value.trim().length === 0 ? null : value;
}

function logMovementFailure(error: unknown): void {
  const errorType = error instanceof Error ? error.name : typeof error;
  logger.error('Falha ao consultar movimentações processuais', undefined, {
    operation: 'process-movements',
    errorType,
  });
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
