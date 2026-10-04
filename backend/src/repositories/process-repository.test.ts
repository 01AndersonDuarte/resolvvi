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

it('busca por CNJ projetando somente identificador e CNJ', async () => {
  const summary = { id: savedProcess.id, cnj: savedProcess.cnj };
  const findUnique = vi.fn().mockResolvedValue(summary);
  const repository = createProcessRepository({ process: { findUnique } } as unknown as PrismaClient);

  await expect(repository.findSummaryByCnj(savedProcess.cnj)).resolves.toBe(summary);
  expect(findUnique).toHaveBeenCalledWith({
    where: { cnj: savedProcess.cnj },
    select: { id: true, cnj: true },
  });
});

it('busca por ID projetando os campos gerais necessários aos detalhes', async () => {
  const details = {
    id: savedProcess.id,
    cnj: savedProcess.cnj,
    forum: 'Foro de teste',
    court: '1ª Vara',
    lawsuitValue: new Prisma.Decimal('10000'),
    numberOfAuthors: 1,
  };
  const findUnique = vi.fn().mockResolvedValue(details);
  const repository = createProcessRepository({ process: { findUnique } } as unknown as PrismaClient);

  await expect(repository.findById(savedProcess.id)).resolves.toBe(details);
  expect(findUnique).toHaveBeenCalledWith({
    where: { id: savedProcess.id },
    select: { id: true, cnj: true, forum: true, court: true, lawsuitValue: true, numberOfAuthors: true },
  });
});
