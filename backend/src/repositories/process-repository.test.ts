import { expect, it, vi } from 'vitest';

import { Prisma, type PrismaClient, type Process } from '../generated/prisma/client.js';
import { createProcessRepository } from './process-repository.js';

const savedProcess = { id: 1, cnj: 'test-cnj' } as Process;

it('cria um processo com os campos recebidos', async () => {
  const create = vi.fn().mockResolvedValue(savedProcess);
  const repository = createProcessRepository({ process: { create } } as unknown as PrismaClient);
  const input = {
    cnj: savedProcess.cnj,
    forum: 'Foro de teste',
    court: '1ª Vara',
    lawsuitValue: new Prisma.Decimal('10000'),
    numberOfAuthors: 1,
  };

  await expect(repository.create(input)).resolves.toBe(savedProcess);
  expect(create).toHaveBeenCalledWith({ data: input });
});

it('busca processo pelo CNJ único', async () => {
  const findUnique = vi.fn().mockResolvedValue(savedProcess);
  const repository = createProcessRepository({ process: { findUnique } } as unknown as PrismaClient);

  await expect(repository.findByCnj(savedProcess.cnj)).resolves.toBe(savedProcess);
  expect(findUnique).toHaveBeenCalledWith({ where: { cnj: savedProcess.cnj } });
});
