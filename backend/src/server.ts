import { createServer, type Server } from 'node:http';

import { createApp } from './app.js';
import { prisma } from './config/database.js';
import { env } from './config/envs.js';
import { parseHttpEnvironment } from './config/http-environment-schema.js';
import { logger } from './config/logger.js';
import type { HttpEnvironment } from './types/config.js';
import { createShutdown } from './shutdown.js';
import { createAuthRepository } from './repositories/auth-repository.js';
import { createAuthRouter } from './routers/auth-router.js';
import { createProcessRouter } from './routers/process-router.js';
import { createAuthService } from './services/auth-service.js';
import { createProcessRepository } from './repositories/process-repository.js';
import { createMovementRepository } from './repositories/movement-repository.js';
import { createProcessAiSummaryRouter } from './routers/process-ai-summary-router.js';
import { createOpenAiSummaryProvider } from './services/openai-summary-service.js';
import { createProcessAiSummaryService } from './services/process-ai-summary-service.js';
import { createSummaryGenerationService } from './services/summary-generation-service.js';
import { createSummaryProviderInput } from './services/summary-prompt-service.js';
import { validateSummaryOutput } from './services/summary-validation-service.js';
import { finishSummaryAttempt, markSummaryAttemptDispatched } from './repositories/summary-attempt-repository.js';
import { publishProcessAiSummary } from './repositories/process-ai-summary-repository.js';
import type { SummaryEnvironment } from './types/config.js';
import type { SummaryProvider } from './types/summary-provider.js';

function registerProcessHandlers(server: Server, closeSummaryTasks: () => Promise<void>): void {
  const shutdown = createShutdown({
    closeResources: async () => {
      await closeSummaryTasks();
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

type BuiltHttpServer = { server: Server; shutdownSummaryTasks: () => Promise<void> };

function createSummaryComponents(
  authService: ReturnType<typeof createAuthService>,
  cookie: { name: string; secure: boolean },
  overrides: { configuration: SummaryEnvironment; provider: SummaryProvider | null },
): { router: ReturnType<typeof createProcessAiSummaryRouter>; shutdown: () => Promise<void> } {
  const { configuration, provider } = overrides;
  const generation = createSummaryGenerationService({
    provider,
    validateSession: async (sessionId) => { await authService.getSessionById(sessionId); },
    markDispatched: (attemptId, now) => markSummaryAttemptDispatched(attemptId, now, prisma),
    validateOutput: validateSummaryOutput,
    publish: async (input) => Boolean(await publishProcessAiSummary(input, prisma)),
    finish: async (input) => {
      const status = input.failureCode === 'GENERATION_TIMEOUT' ? 'expired' : input.failureCode === 'SOURCE_CHANGED' ? 'source_changed' : 'failed';
      const command: Parameters<typeof finishSummaryAttempt>[0] = {
        attemptId: input.attemptId, status, failureCode: input.failureCode, finishedAt: input.now,
        retryAt: input.retryAt,
      };
      if (input.usage !== undefined) command.usage = input.usage;
      if (input.providerRequestId !== undefined) command.providerRequestId = input.providerRequestId;
      await finishSummaryAttempt(command, prisma);
    },
    createProviderInput: createSummaryProviderInput,
  });
  const service = createProcessAiSummaryService({ client: prisma, configuration, provider, generation });
  return { router: createProcessAiSummaryRouter({ authService, service, cookie }), shutdown: () => generation.shutdown() };
}

function buildHttpServer(
  configuration: HttpEnvironment,
  summary: { configuration: SummaryEnvironment; provider: SummaryProvider | null },
): BuiltHttpServer {
  const secureCookie = new URL(configuration.publicAppUrl).protocol === 'https:';
  const authService = createAuthService({
    repositories: createAuthRepository(prisma),
  });
  const cookie = { name: secureCookie ? '__Host-session' : 'session', secure: secureCookie };
  const summaryComponents = createSummaryComponents(authService, cookie, summary);
  const server = createServer(createApp({
    authRouter: createAuthRouter(authService, cookie),
    processRouter: createProcessRouter({
      authService,
      processRepository: createProcessRepository(prisma),
      movementRepository: createMovementRepository(prisma),
      cookie,
    }),
    processAiSummaryRouter: summaryComponents.router,
    publicAppUrl: configuration.publicAppUrl,
  }));
  return { server, shutdownSummaryTasks: summaryComponents.shutdown };
}

export function createHttpServer(source: NodeJS.ProcessEnv): Server {
  const summary = env.summary.enabled
    ? { configuration: env.summary, provider: createOpenAiSummaryProvider(env.summary) }
    : { configuration: env.summary, provider: null };
  return buildHttpServer(parseHttpEnvironment(source), summary).server;
}

export function createE2eHttpServer(source: NodeJS.ProcessEnv, provider: SummaryProvider): BuiltHttpServer {
  if (source.NODE_ENV !== 'test' || !source.DATABASE_LABEL?.endsWith('_test')) {
    throw new Error('The E2E server requires NODE_ENV=test and an isolated test database.');
  }
  return buildHttpServer(parseHttpEnvironment(source), {
    configuration: { ...env.summary, enabled: true, apiKey: 'e2e-fake-provider' },
    provider,
  });
}

export function startServer(source: NodeJS.ProcessEnv = process.env): Server {
  const configuration = parseHttpEnvironment(source);
  const summary = env.summary.enabled
    ? { configuration: env.summary, provider: createOpenAiSummaryProvider(env.summary) }
    : { configuration: env.summary, provider: null };
  const built = buildHttpServer(configuration, summary);
  const { server } = built;
  server.listen(configuration.port, () => {
    logger.info('Servidor HTTP iniciado', { port: configuration.port });
  });
  registerProcessHandlers(server, built.shutdownSummaryTasks);

  return server;
}
