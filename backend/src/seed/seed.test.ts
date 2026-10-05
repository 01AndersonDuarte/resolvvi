import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/database.js', () => ({
  prisma: { process: { count: vi.fn() }, $transaction: vi.fn(), $disconnect: vi.fn() },
}));
vi.mock('../config/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { executeSeed } from './seed.js';

const mockedPrisma = prisma as unknown as {
  process: { count: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
  $disconnect: ReturnType<typeof vi.fn>;
};

describe('comando de seed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.process.count.mockResolvedValue(0);
    process.exitCode = 0;
  });

  it('registra a carga concluída e desconecta o banco', executeSeedSuccessfully);
  it('ignora o seed quando a base já contém processos', executeSeedWhenDatabaseIsPopulated);
  it('registra a falha, define código de saída e desconecta o banco', executeSeedWithFailure);
});

async function executeSeedSuccessfully(): Promise<void> {
  mockedPrisma.process.count.mockResolvedValue(0);
  mockedPrisma.$transaction.mockResolvedValue(undefined);

  await executeSeed();

  expect(logger.info).toHaveBeenCalledWith('Seed inicial concluído', {
    processCount: 100,
    movementCount: 5568,
  });
  expect(mockedPrisma.$disconnect).toHaveBeenCalledOnce();
  expect(process.exitCode).toBe(0);
}

async function executeSeedWhenDatabaseIsPopulated(): Promise<void> {
  mockedPrisma.process.count.mockResolvedValue(1);

  await executeSeed();

  expect(logger.info).toHaveBeenCalledWith('Seed inicial ignorado: a base já contém processos', {
    processCount: 1,
  });
  expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  expect(mockedPrisma.$disconnect).toHaveBeenCalledOnce();
  expect(process.exitCode).toBe(0);
}

async function executeSeedWithFailure(): Promise<void> {
  mockedPrisma.$transaction.mockRejectedValue(new Error('Falha de persistência'));

  await executeSeed();

  expect(logger.error).toHaveBeenCalledWith('Falha ao executar seed inicial', expect.any(Error));
  expect(mockedPrisma.$disconnect).toHaveBeenCalledOnce();
  expect(process.exitCode).toBe(1);
}
