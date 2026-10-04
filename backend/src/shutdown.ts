import type { Server } from 'node:http';

import { logger } from './config/logger.js';

const SHUTDOWN_TIMEOUT_MS = 15_000;

type ShutdownDependencies = {
  closeResources: () => Promise<void>;
  forceExit: (code: number) => void;
  server: Server;
};

export function createShutdown(dependencies: ShutdownDependencies): (signal: string) => Promise<void> {
  let shutdownPromise: Promise<void> | undefined;

  return (signal: string): Promise<void> => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    logger.info('Desligamento do servidor iniciado', { signal });
    shutdownPromise = new Promise((resolve) => {
      const forceExitTimer = setTimeout(() => dependencies.forceExit(1), SHUTDOWN_TIMEOUT_MS);
      const finishShutdown = async (error?: Error): Promise<void> => {
        if (error) {
          logger.error('Falha ao encerrar o servidor HTTP', error, { signal });
        }

        try {
          await dependencies.closeResources();
        } catch (resourceError) {
          logger.error('Falha ao liberar recursos do servidor', resourceError, { signal });
          process.exitCode = 1;
        }

        clearTimeout(forceExitTimer);
        logger.info('Servidor desligado', { signal });
        resolve();
      };
      dependencies.server.close((error) => void finishShutdown(error));
    });

    return shutdownPromise;
  };
}
