import type { Movement, PrismaClient } from '../generated/prisma/client.js';
import type { CreateMovementInput, MovementRepository } from '../types/process.js';

export type { CreateMovementInput, MovementRepository };

export function createMovement(input: CreateMovementInput, client: PrismaClient): Promise<Movement> {
  return client.movement.create({ data: input });
}

export function listMovementsByProcess(processId: number, client: PrismaClient): Promise<Movement[]> {
  return client.movement.findMany({
    where: { processId },
    orderBy: [{ movementDate: 'asc' }, { sourceOrder: 'asc' }],
  });
}

export function createMovementRepository(client: PrismaClient): MovementRepository {
  return {
    create: (input) => createMovement(input, client),
    listByProcess: (processId) => listMovementsByProcess(processId, client),
  };
}
