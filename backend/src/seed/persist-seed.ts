import { Prisma, type PrismaClient } from '../generated/prisma/client.js';
import type { SeedProcess } from './seed-data.js';

export async function persistSeed(data: SeedProcess[], client: PrismaClient): Promise<void> {
  await client.$transaction(async (transaction) => {
    for (const process of data) {
      const { movements, ...processData } = process;
      await transaction.process.create({
        data: {
          ...processData,
          lawsuitValue: new Prisma.Decimal(process.lawsuitValue),
          movements: { create: movements },
        },
      });
    }
  });
}
