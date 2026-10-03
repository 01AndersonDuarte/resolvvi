import { fileURLToPath } from 'node:url';

import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { parseSeedFile } from './parse-seed-file.js';
import { persistSeed } from './persist-seed.js';

const seedFilePath = fileURLToPath(new URL('../../../lawsuits_movements.csv', import.meta.url));

export async function runSeed(): Promise<void> {
  const data = await parseSeedFile(seedFilePath);
  await persistSeed(data, prisma);
  logger.info('Seed inicial concluído', {
    processCount: data.length,
    movementCount: data.reduce((total, process) => total + process.movements.length, 0),
  });
}

export async function executeSeed(): Promise<void> {
  try {
    logger.info('Iniciando seed inicial');
    await runSeed();
  } catch (error: unknown) {
    logger.error('Falha ao executar seed inicial', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) void executeSeed();
