import { expect, it, vi } from 'vitest';

import type { Movement, PrismaClient } from '../generated/prisma/client.js';
import { createMovementRepository } from './movement-repository.js';

const savedMovement = { id: 1, processId: 1 } as Movement;

it('cria uma movimentação associada ao processo', async () => {
  const create = vi.fn().mockResolvedValue(savedMovement);
  const repository = createMovementRepository({ movement: { create } } as unknown as PrismaClient);
  const input = {
    processId: 1,
    movementDate: new Date('2023-12-05T00:00:00.000Z'),
    movementTitle: 'Movimentação de teste',
    movementContent: null,
    sourceOrder: 1,
  };

  await expect(repository.create(input)).resolves.toBe(savedMovement);
  expect(create).toHaveBeenCalledWith({ data: input });
});

it('lista movimentações por data e ordem de origem', async () => {
  const findMany = vi.fn().mockResolvedValue([savedMovement]);
  const repository = createMovementRepository({ movement: { findMany } } as unknown as PrismaClient);

  await expect(repository.listByProcess(7)).resolves.toEqual([savedMovement]);
  expect(findMany).toHaveBeenCalledWith({
    where: { processId: 7 },
    orderBy: [{ movementDate: 'asc' }, { sourceOrder: 'asc' }, { id: 'asc' }],
  });
});

it('conta eventos vinculados ao processo', async () => {
  const count = vi.fn().mockResolvedValue(21);
  const repository = createMovementRepository({ movement: { count } } as unknown as PrismaClient);

  await expect(repository.countByProcess(7)).resolves.toBe(21);
  expect(count).toHaveBeenCalledWith({ where: { processId: 7 } });
});

it('busca somente a página solicitada em ordem global estável decrescente', async () => {
  const findMany = vi.fn().mockResolvedValue([savedMovement]);
  const repository = createMovementRepository({ movement: { findMany } } as unknown as PrismaClient);

  await expect(repository.listPageByProcess({ processId: 7, page: 3 })).resolves.toEqual([savedMovement]);
  expect(findMany).toHaveBeenCalledWith({
    where: { processId: 7 },
    orderBy: [{ movementDate: 'desc' }, { sourceOrder: 'asc' }, { id: 'asc' }],
    skip: 40,
    take: 20,
  });
});
