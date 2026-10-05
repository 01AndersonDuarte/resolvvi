import './config/envs.js';

import express from 'express';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { prisma } from './config/database.js';
import { createE2eHttpServer } from './server.js';
import { SummaryProviderError, type SummaryProvider, type SummaryProviderResult } from './types/summary-provider.js';

type ProviderMode = 'success' | 'unavailable' | 'invalid' | 'held';
type ProviderState = { calls: number; mode: ProviderMode; releasePending: (() => void)[] };

function createFakeSummaryProvider(state: ProviderState): SummaryProvider {
  return {
    configuration: { provider: 'e2e-fake', model: 'deterministic', configurationHash: 'e'.repeat(64) },
    generate(input) {
      state.calls += 1;
      if (state.mode === 'unavailable') return Promise.reject(new SummaryProviderError('unavailable'));
      const refs = readSourceRefs(input.source);
      const output = state.mode === 'invalid' ? { language: 'en', paragraphs: [] } : {
        language: 'pt-BR',
        paragraphs: [{ sentences: [{ text: 'A parte ré apresentou defesa e negou responsabilidade pelo dano.', sourceRefs: refs }] }],
      };
      const result = { output, status: 'completed' as const, refusal: null, model: 'deterministic', usage: null };
      if (state.mode === 'held') return waitForProviderRelease(input.signal, state, result);
      return Promise.resolve(result);
    },
  };
}

function waitForProviderRelease(
  signal: AbortSignal,
  state: ProviderState,
  result: SummaryProviderResult,
): Promise<SummaryProviderResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new SummaryProviderError('unavailable'));
    const release = (): void => {
      signal.removeEventListener('abort', abort);
      resolve(result);
    };
    const abort = (): void => {
      signal.removeEventListener('abort', abort);
      reject(new SummaryProviderError('unavailable'));
    };
    signal.addEventListener('abort', abort, { once: true });
    state.releasePending.push(release);
  });
}

function readSourceRefs(source: string): string[] {
  const parsed = JSON.parse(source) as unknown;
  if (typeof parsed !== 'object' || parsed === null || !('records' in parsed) || !Array.isArray(parsed.records)) return [];
  const records = parsed.records as unknown[];
  const matching = records.find((record) => isSummaryFixtureRecord(record));
  return typeof matching === 'object' && matching !== null && 'ref' in matching && typeof matching.ref === 'string'
    ? [matching.ref]
    : [];
}

function isSummaryFixtureRecord(value: unknown): value is { ref: string; content: string } {
  return typeof value === 'object' && value !== null && 'ref' in value && typeof value.ref === 'string'
    && 'content' in value && typeof value.content === 'string'
    && value.content.startsWith('A parte ré apresentou defesa e negou responsabilidade pelo dano.');
}

function assertIsolatedTestEnvironment(): void {
  if (process.env.NODE_ENV !== 'test' || !process.env.DATABASE_LABEL?.endsWith('_test')) {
    throw new Error('The E2E harness requires NODE_ENV=test and an isolated test database.');
  }
}

function createControlServer(providerState: ProviderState): Server {
  const app = express();
  app.use(express.json({ limit: '2kb' }));
  registerSessionControls(app);
  registerProviderControls(app, providerState);
  registerSourceControls(app);
  return createServer(app);
}

function registerSessionControls(app: express.Express): void {
  app.post('/expire-session', async (request, response) => {
    const email = readEmail(request.body);
    if (!email) return response.status(400).end();
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return response.status(404).end();
    await prisma.session.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(0) } });
    return response.status(204).end();
  });
}

function registerProviderControls(app: express.Express, providerState: ProviderState): void {
  app.get('/summary-provider', (_request, response) => response.json(providerState));
  app.post('/summary-provider', (request, response) => {
    if (!isProviderMode(request.body)) return response.status(400).end();
    providerState.mode = request.body.mode;
    return response.status(204).end();
  });
  app.post('/summary-provider/reset', (_request, response) => {
    providerState.calls = 0;
    providerState.mode = 'success';
    return response.status(204).end();
  });
  app.post('/summary-provider/release', (_request, response) => {
    providerState.mode = 'success';
    providerState.releasePending.splice(0).forEach((release) => release());
    return response.status(204).end();
  });
}

function registerSourceControls(app: express.Express): void {
  app.post('/change-source', async (request, response) => {
    const movementId = readMovementId(request.body);
    if (movementId === null) return response.status(400).end();
    const movement = await prisma.movement.updateMany({
      where: { id: movementId },
      data: {
        movementTitle: 'Defesa apresentada pela parte ré',
        movementContent: `A parte ré apresentou defesa e negou responsabilidade pelo dano. Revisão E2E ${randomUUID()}.`,
      },
    });
    return response.status(movement.count === 1 ? 204 : 404).end();
  });
  app.get('/process-movements/:processId', async (request, response) => {
    const processId = Number(request.params.processId);
    if (!Number.isSafeInteger(processId) || processId <= 0) return response.status(400).end();
    const movement = await prisma.movement.findFirst({
      where: { processId },
      orderBy: [{ movementDate: 'asc' }, { sourceOrder: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    if (!movement) return response.status(404).end();
    return response.json({ movementId: movement.id });
  });
}

function readEmail(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('email' in body) || typeof body.email !== 'string') return null;
  return body.email;
}

function isProviderMode(body: unknown): body is { mode: ProviderMode } {
  return typeof body === 'object' && body !== null && 'mode' in body &&
    (body.mode === 'success' || body.mode === 'unavailable' || body.mode === 'invalid' || body.mode === 'held');
}

function readMovementId(body: unknown): number | null {
  return typeof body === 'object' && body !== null && 'movementId' in body &&
    typeof body.movementId === 'number' && Number.isInteger(body.movementId) && body.movementId > 0
    ? body.movementId
    : null;
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
}

async function close(server: Server): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function startHarness(): Promise<void> {
  assertIsolatedTestEnvironment();
  const apiPort = Number(process.env.PORT);
  const controlPort = Number(process.env.E2E_CONTROL_PORT);
  const providerState: ProviderState = { calls: 0, mode: 'success', releasePending: [] };
  const summaryServer = createE2eHttpServer(process.env, createFakeSummaryProvider(providerState));
  const apiServer = summaryServer.server;
  const controlServer = createControlServer(providerState);
  await listen(controlServer, controlPort);
  await listen(apiServer, apiPort);
  const shutdown = async (): Promise<void> => {
    await Promise.all([close(apiServer), close(controlServer), summaryServer.shutdownSummaryTasks()]);
    await prisma.$disconnect();
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
}

void startHarness();
