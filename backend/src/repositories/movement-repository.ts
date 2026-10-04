import type { Movement, PrismaClient } from '../generated/prisma/client.js';
import type { CreateMovementInput, MovementPageQuery, MovementRepository } from '../types/process.js';

export type { CreateMovementInput, MovementRepository };

const MOVEMENT_PAGE_SIZE = 20;

export function createMovement(input: CreateMovementInput, client: PrismaClient): Promise<Movement> {
  return client.movement.create({ data: input });
}

export function listMovementsByProcess(processId: number, client: PrismaClient): Promise<Movement[]> {
  return client.movement.findMany({
    where: { processId },
    orderBy: [{ movementDate: 'asc' }, { sourceOrder: 'asc' }],
  });
}

export function countMovementsByProcess(processId: number, client: PrismaClient): Promise<number> {
  return client.movement.count({ where: { processId } });
}

export function listMovementPageByProcess(
  input: MovementPageQuery,
  client: PrismaClient,
): Promise<Movement[]> {
  return client.movement.findMany({
    where: { processId: input.processId },
    orderBy: [{ movementDate: 'desc' }, { sourceOrder: 'asc' }, { id: 'asc' }],
    skip: (input.page - 1) * MOVEMENT_PAGE_SIZE,
    take: MOVEMENT_PAGE_SIZE,
  });
}

export function createMovementRepository(client: PrismaClient): MovementRepository {
  return {
    create: (input) => createMovement(input, client),
    listByProcess: (processId) => listMovementsByProcess(processId, client),
    countByProcess: (processId) => countMovementsByProcess(processId, client),
    listPageByProcess: (input) => listMovementPageByProcess(input, client),
  };
}
