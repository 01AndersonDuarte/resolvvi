import { fileURLToPath } from 'node:url';

import { prisma } from '../../../backend/src/config/database.js';
import { createMovementRepository } from '../../../backend/src/repositories/movement-repository.js';
import { parseSeedFile } from '../../../backend/src/seed/parse-seed-file.js';
import type { SeedMovement, SeedProcess } from '../../../backend/src/seed/seed-data.js';
import type { Movement } from '../../../backend/src/generated/prisma/client.js';

type PersistedProcess = {
  id: number;
  cnj: string;
  forum: string;
  court: string;
  lawsuitValue: { toString: () => string };
  numberOfAuthors: number;
  movements: Movement[];
};

const csvPath = fileURLToPath(new URL('../../../lawsuits_movements.csv', import.meta.url));

function matchesProcess(source: SeedProcess, persisted: PersistedProcess): boolean {
  return source.cnj === persisted.cnj
    && source.forum === persisted.forum
    && source.court === persisted.court
    && source.lawsuitValue === persisted.lawsuitValue.toString()
    && source.numberOfAuthors === persisted.numberOfAuthors;
}

function matchesMovement(source: SeedMovement, persisted: Movement | undefined): boolean {
  return persisted !== undefined
    && source.movementDate.toISOString().slice(0, 10) === persisted.movementDate.toISOString().slice(0, 10)
    && source.movementTitle === persisted.movementTitle
    && source.movementContent === persisted.movementContent
    && source.sourceOrder === persisted.sourceOrder;
}

function compareMovementOrder(left: SeedMovement, right: SeedMovement): number {
  const dateDifference = left.movementDate.getTime() - right.movementDate.getTime();

  return dateDifference === 0 ? left.sourceOrder - right.sourceOrder : dateDifference;
}

async function verifySeed(): Promise<void> {
  const sourceProcesses = await parseSeedFile(csvPath);
  const persistedProcesses = await prisma.process.findMany({ include: { movements: true } });
  const persistedByCnj = new Map(persistedProcesses.map((process) => [process.cnj, process]));
  const movementRepository = createMovementRepository(prisma);
  let matchingProcesses = 0;
  let matchingMovements = 0;
  let sortedProcesses = 0;

  for (const source of sourceProcesses) {
    const persisted = persistedByCnj.get(source.cnj);
    if (!persisted) continue;

    const movementByOrder = new Map(persisted.movements.map((movement) => [movement.sourceOrder, movement]));
    const matched = source.movements.filter((movement) => matchesMovement(movement, movementByOrder.get(movement.sourceOrder)));
    const actualOrder = await movementRepository.listByProcess(persisted.id);
    const expectedOrder = [...source.movements].sort(compareMovementOrder);

    matchingProcesses += Number(matchesProcess(source, persisted));
    matchingMovements += matched.length;
    sortedProcesses += Number(expectedOrder.every((movement, index) => actualOrder[index]?.sourceOrder === movement.sourceOrder));
  }

  const expectedMovements = sourceProcesses.reduce((total, process) => total + process.movements.length, 0);
  const summary = {
    expectedProcesses: sourceProcesses.length,
    persistedProcesses: persistedProcesses.length,
    matchingProcesses,
    expectedMovements,
    persistedMovements: persistedProcesses.reduce((total, process) => total + process.movements.length, 0),
    matchingMovements,
    processesInExpectedMovementOrder: sortedProcesses,
    cnjsWithLeadingZero: sourceProcesses.filter((process) => process.cnj.startsWith('0')).length,
    movementsWithEmptyContent: sourceProcesses.flatMap((process) => process.movements).filter((movement) => movement.movementContent === null).length,
    movementsWithMultilineContent: sourceProcesses.flatMap((process) => process.movements).filter((movement) => movement.movementContent?.includes('\n')).length,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (matchingProcesses !== sourceProcesses.length || matchingMovements !== expectedMovements || sortedProcesses !== sourceProcesses.length) {
    process.exitCode = 1;
  }
}

verifySeed().finally(() => prisma.$disconnect());
