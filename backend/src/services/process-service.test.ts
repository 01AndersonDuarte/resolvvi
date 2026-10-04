import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Process } from '../generated/prisma/client.js';
import type { ProcessRepository } from '../types/process.js';
import { createProcessService } from './process-service.js';

const record = { id: 1, cnj: '1002271-82.2025.8.26.0003' } as Process;
const invalidProcessIds = ['0', '-1', '1x', '1.2', '2147483648', '999999999999999999999999'];
const findSummaryByCnj = vi.fn<ProcessRepository['findSummaryByCnj']>();
const findSummaryById = vi.fn<ProcessRepository['findSummaryById']>();
const repository: ProcessRepository = {
  create: vi.fn<ProcessRepository['create']>(), findByCnj: vi.fn(), findSummaryByCnj, findSummaryById,
};
const service = createProcessService(repository);

describe('consulta processual', () => {
  beforeEach(() => {
    findSummaryByCnj.mockReset();
    findSummaryById.mockReset();
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

  it('busca por ID positivo e limita a projeção ao contrato mínimo', async () => {
    findSummaryById.mockResolvedValue({ id: record.id, cnj: record.cnj });

    await expect(service.getById('1')).resolves.toEqual({ id: 1, cnj: record.cnj });
    expect(findSummaryById).toHaveBeenCalledWith(1);
  });

  it.each(invalidProcessIds)('recusa ID inválido %s como ausente', rejectInvalidId);
  it('mapeia falhas ao carregar o destino sem tratá-las como ausência', loadDestinationFailure);
});

async function rejectInvalidId(id: string): Promise<void> {
  await expect(service.getById(id)).rejects.toMatchObject({ code: 'PROCESS_NOT_FOUND', status: 404 });
  expect(findSummaryById).not.toHaveBeenCalled();
}

async function loadDestinationFailure(): Promise<void> {
  findSummaryById.mockRejectedValue(new Error('database offline'));

  await expect(service.getById('1')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', status: 503 });
}
