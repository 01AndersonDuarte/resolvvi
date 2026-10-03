import type { Movement, PrismaClient } from '../generated/prisma/client.js';

export type CreateMovementInput = Pick<
  Movement,
  'processId' | 'movementDate' | 'movementTitle' | 'movementContent' | 'sourceOrder'
>;

export type MovementRepository = {
  create: (input: CreateMovementInput) => Promise<Movement>;
  listByProcess: (processId: number) => Promise<Movement[]>;
};

export function createMovementRepository(client: PrismaClient): MovementRepository {
  return {
    create: (input) => client.movement.create({ data: input }),
    listByProcess: (processId) => client.movement.findMany({
      where: { processId },
      orderBy: [{ movementDate: 'asc' }, { sourceOrder: 'asc' }],
    }),
  };
}
