import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma, type Process } from '../generated/prisma/client.js';
import { logger } from '../config/logger.js';
import type { ProcessRepository } from '../types/process.js';
import { createProcessService } from './process-service.js';

const record = { id: 1, cnj: '1002271-82.2025.8.26.0003' } as Process;
const findSummaryByCnj = vi.fn<ProcessRepository['findSummaryByCnj']>();
const findById = vi.fn<ProcessRepository['findById']>();
const repository: ProcessRepository = {
  create: vi.fn<ProcessRepository['create']>(), findByCnj: vi.fn(), findSummaryByCnj, findById,
};
const service = createProcessService(repository);

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
  });

  const failure = await failingService.getById(1).catch((error: unknown) => error);

  expect(failure).toMatchObject({ code: 'SERVICE_UNAVAILABLE', status: 503 });
  expect(loggerSpy).toHaveBeenCalledWith('Falha ao consultar detalhes processuais', undefined, {
    operation: 'process-details', errorType: 'Error',
  });
  expect(JSON.stringify(loggerSpy.mock.calls)).not.toContain('database secret detail');
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
