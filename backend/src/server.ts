import { createServer, type Server } from 'node:http';

import { createApp } from './app.js';
import { parseHttpEnvironment } from './config/http-environment-schema.js';
import { logger } from './config/logger.js';
import type { HttpEnvironment } from './protocols.js';
import { createShutdown } from './shutdown.js';

function registerProcessHandlers(server: Server): void {
  const shutdown = createShutdown({
    closeResources: async () => {
      const { prisma } = await import('./config/database.js');
      await prisma.$disconnect();
    },
    forceExit: (code) => process.exit(code),
    server,
  });
  const crash = (origin: string, error: unknown): void => {
    logger.error('Erro fatal não tratado', error, { origin });
    process.exitCode = 1;
    void shutdown(origin);
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (error: unknown) => crash('unhandledRejection', error));
  process.on('uncaughtException', (error: Error) => crash('uncaughtException', error));
}

function buildHttpServer(configuration: HttpEnvironment): Server {
  return createServer(createApp({ publicAppUrl: configuration.publicAppUrl }));
}

export function createHttpServer(source: NodeJS.ProcessEnv): Server {
  return buildHttpServer(parseHttpEnvironment(source));
}

export function startServer(source: NodeJS.ProcessEnv = process.env): Server {
  const configuration = parseHttpEnvironment(source);
  const server = buildHttpServer(configuration);
  server.listen(configuration.port, () => {
    logger.info('Servidor HTTP iniciado', { port: configuration.port });
  });
  registerProcessHandlers(server);

  return server;
}
