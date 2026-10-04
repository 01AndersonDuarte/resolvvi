import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma, type Movement, type Process } from '../generated/prisma/client.js';
import { logger } from '../config/logger.js';
import type { MovementRepository, ProcessRepository } from '../types/process.js';
import { createProcessService } from './process-service.js';

const record = { id: 1, cnj: '1002271-82.2025.8.26.0003' } as Process;
const findSummaryByCnj = vi.fn<ProcessRepository['findSummaryByCnj']>();
const findById = vi.fn<ProcessRepository['findById']>();
const countByProcess = vi.fn<MovementRepository['countByProcess']>();
const listPageByProcess = vi.fn<MovementRepository['listPageByProcess']>();
const repository: ProcessRepository = {
  create: vi.fn<ProcessRepository['create']>(), findByCnj: vi.fn(), findSummaryByCnj, findById,
};
const movementRepository: MovementRepository = {
  create: vi.fn(), listByProcess: vi.fn(), countByProcess, listPageByProcess,
};
const service = createProcessService(repository, movementRepository);

describe('busca de processos', () => {
  beforeEach(() => {
    findSummaryByCnj.mockReset();
  });

  it('busca a máscara canônica e retorna somente id e CNJ', async () => {
    findSummaryByCnj.mockResolvedValue({ id: record.id, cnj: record.cnj });

    await expect(service.search('10022718220258260003')).resolves.toEqual({ id: 1, cnj: record.cnj });
    expect(findSummaryByCnj).toHaveBeenCalledWith(record.cnj);
  });

  it('retorna ausência distinta sem converter falha de infraestrutura em 404', async () => {
    findSummaryByCnj.mockResolvedValue(null);
    await expect(service.search(record.cnj)).rejects.toMatchObject({ code: 'PROCESS_NOT_FOUND', status: 404 });

    findSummaryByCnj.mockRejectedValue(new Error('database offline'));
    await expect(service.search(record.cnj)).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', status: 503 });
  });

});

describe('detalhes processuais', () => {
  beforeEach(() => findById.mockReset());

  it('serializa informações gerais sem perder a precisão do valor', serializeProcessDetails);

  it('preserva campos gerais ausentes e rejeita processo sem CNJ confiável', async () => {
    findById.mockResolvedValue({
      id: record.id,
      cnj: record.cnj,
      forum: null,
      court: null,
      lawsuitValue: null,
      numberOfAuthors: 0,
    });
    await expect(service.getById(1)).resolves.toMatchObject({
      forum: null, court: null, lawsuitValue: null, numberOfAuthors: 0,
    });

    findById.mockResolvedValue({
      id: record.id, cnj: ' ', forum: null, court: null, lawsuitValue: null, numberOfAuthors: null,
    });
    await expect(service.getById(1)).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', status: 503 });
  });

  it('classifica indisponibilidade sem registrar detalhes da falha', loadDetailsFailure);
});

async function loadDetailsFailure(): Promise<void> {
  const loggerSpy = vi.spyOn(logger, 'error').mockReturnValue(undefined);
  const failingService = createProcessService({
    ...repository,
    findById: async () => Promise.reject(new Error('database secret detail')),
  }, movementRepository);

  const failure = await failingService.getById(1).catch((error: unknown) => error);

  expect(failure).toMatchObject({ code: 'SERVICE_UNAVAILABLE', status: 503 });
  expect(loggerSpy).toHaveBeenCalledWith('Falha ao consultar detalhes processuais', undefined, {
    operation: 'process-details', errorType: 'Error',
  });
  expect(JSON.stringify(loggerSpy.mock.calls)).not.toContain('database secret detail');
}

describe('metadados da página de movimentações', movementMetadataCases);
describe('serialização das movimentações', movementSerializationCases);
describe('falhas na consulta de movimentações', movementFailureCases);

function movementMetadataCases(): void {
  beforeEach(resetMovementMocks);
  it.each([0, 1, 20, 21, 120, 1000])('calcula limites para total %i', verifyMovementMetadata);
}

function movementSerializationCases(): void {
  beforeEach(resetMovementMocks);
  it('preserva dia civil e texto significativo, normalizando texto branco', verifyMovementSerialization);
  it('normaliza data inválida em fixture defensiva', verifyInvalidMovementDate);
  it('normaliza campos defensivos ausentes', verifyMissingMovementFields);
}

function movementFailureCases(): void {
  beforeEach(resetMovementMocks);
  it('distingue processo inexistente e falha segura de persistência', movementsFailureContracts);
}

function resetMovementMocks(): void {
  findById.mockReset();
  countByProcess.mockReset();
  listPageByProcess.mockReset();
}

async function verifyMovementMetadata(total: number): Promise<void> {
  findById.mockResolvedValue(processDetailsRecord());
  countByProcess.mockResolvedValue(total);
  listPageByProcess.mockResolvedValue([]);
  const totalPages = Math.ceil(total / 20);
  const page = totalPages || 1;
  await expect(service.listMovements({ id: '1', query: { page: String(page) } })).resolves.toMatchObject({
    processId: 1, items: [], page, pageSize: 20, total, totalPages,
  });
  await expect(service.listMovements({ id: '1', query: { page: String(page + 1) } })).rejects
    .toMatchObject({ code: 'INVALID_INPUT', status: 400 });
}

async function verifyMovementSerialization(): Promise<void> {
  findById.mockResolvedValue(processDetailsRecord());
  countByProcess.mockResolvedValue(1);
  listPageByProcess.mockResolvedValue([{
    id: 8, processId: 1, movementDate: new Date('2025-01-02T00:00:00.000Z'),
    movementTitle: '  Título\n preservado  ', movementContent: '   ', sourceOrder: 1,
  }]);
  const previousTimeZone = process.env.TZ;
  try {
    for (const timeZone of ['UTC', 'Pacific/Honolulu', 'Pacific/Kiritimati']) {
      process.env.TZ = timeZone;
      await expect(service.listMovements({ id: '1', query: {} })).resolves.toMatchObject({
        items: [{ id: 8, movementDate: '02/01/2025' }],
      });
    }
  } finally {
    if (previousTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimeZone;
  }
  await expect(service.listMovements({ id: '1', query: {} })).resolves.toMatchObject({
    items: [{ movementTitle: '  Título\n preservado  ', movementContent: null }],
  });
}

async function verifyInvalidMovementDate(): Promise<void> {
  findById.mockResolvedValue(processDetailsRecord());
  countByProcess.mockResolvedValue(1);
  listPageByProcess.mockResolvedValue([{
    id: 9, processId: 1, movementDate: new Date(Number.NaN),
    movementTitle: 'Título', movementContent: null, sourceOrder: 1,
  }]);
  await expect(service.listMovements({ id: '1', query: {} })).resolves.toMatchObject({
    items: [{ movementDate: null }],
  });
}

async function verifyMissingMovementFields(): Promise<void> {
  findById.mockResolvedValue(processDetailsRecord());
  countByProcess.mockResolvedValue(1);
  listPageByProcess.mockResolvedValue([{
    id: 10, processId: 1, movementDate: undefined,
    movementTitle: undefined, movementContent: null, sourceOrder: 1,
  } as unknown as Movement]);
  await expect(service.listMovements({ id: '1', query: {} })).resolves.toMatchObject({
    items: [{ movementDate: null, movementTitle: null, movementContent: null }],
  });
}

async function movementsFailureContracts(): Promise<void> {
  findById.mockResolvedValue(null);
  await expect(service.listMovements({ id: '1', query: {} })).rejects
    .toMatchObject({ code: 'PROCESS_NOT_FOUND', status: 404 });
  expect(countByProcess).not.toHaveBeenCalled();

  findById.mockResolvedValue(processDetailsRecord());
  countByProcess.mockRejectedValue(new Error('database secret detail'));
  const loggerSpy = vi.spyOn(logger, 'error').mockReturnValue(undefined);
  await expect(service.listMovements({ id: '1', query: {} })).rejects
    .toMatchObject({ code: 'SERVICE_UNAVAILABLE', status: 503 });
  expect(JSON.stringify(loggerSpy.mock.calls)).not.toContain('database secret detail');
}

function processDetailsRecord(): NonNullable<Awaited<ReturnType<ProcessRepository['findById']>>> {
  return {
    id: 1, cnj: record.cnj, forum: 'Foro', court: 'Vara',
    lawsuitValue: new Prisma.Decimal('1'), numberOfAuthors: 1,
  };
}

async function serializeProcessDetails(): Promise<void> {
  findById.mockResolvedValue({
    id: record.id,
    cnj: record.cnj,
    forum: 'Foro de teste',
    court: '1ª Vara Cível',
    lawsuitValue: new Prisma.Decimal('10168.2'),
    numberOfAuthors: 0,
  });

  await expect(service.getById(1)).resolves.toEqual({
    id: 1,
    cnj: record.cnj,
    forum: 'Foro de teste',
    court: '1ª Vara Cível',
    lawsuitValue: '10.168,20',
    numberOfAuthors: 0,
  });
  expect(findById).toHaveBeenCalledWith(1);
}
