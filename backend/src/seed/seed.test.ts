import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/database.js', () => ({
  prisma: { $transaction: vi.fn(), $disconnect: vi.fn() },
}));
vi.mock('../config/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { executeSeed } from './seed.js';

const mockedPrisma = prisma as unknown as {
  $transaction: ReturnType<typeof vi.fn>;
  $disconnect: ReturnType<typeof vi.fn>;
};

describe('comando de seed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
  });

  it('registra a carga concluída e desconecta o banco', executeSeedSuccessfully);
  it('registra a falha, define código de saída e desconecta o banco', executeSeedWithFailure);
});

async function executeSeedSuccessfully(): Promise<void> {
  mockedPrisma.$transaction.mockResolvedValue(undefined);

  await executeSeed();

  expect(logger.info).toHaveBeenCalledWith('Seed inicial concluído', {
    processCount: 100,
    movementCount: 5568,
  });
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
