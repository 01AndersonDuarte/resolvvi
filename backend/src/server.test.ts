import type { Server } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { createE2eHttpServer, createHttpServer } from './server.js';
import { createShutdown } from './shutdown.js';
import type { SummaryProvider } from './types/summary-provider.js';

const source: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  DATABASE_LABEL: 'isolated_e2e_test',
  PORT: '3000',
  PUBLIC_APP_URL: 'http://127.0.0.1:5100',
};

function fakeProvider(): SummaryProvider {
  return {
    configuration: { provider: 'fake', model: 'test', configurationHash: 'a'.repeat(64) },
    generate: () => Promise.resolve({ output: {}, status: 'completed', refusal: null, model: 'test', usage: null }),
  };
}

function createCloseableServer(): Server {
  return { close: (callback?: (error?: Error) => void) => callback?.() } as unknown as Server;
}

it('validates HTTP settings before creating a server that can listen', () => {
  expect(() => createHttpServer({})).toThrow('Configuração inválida');

  const server = createHttpServer(source);

  expect(server.listening).toBe(false);
});

describe('createShutdown', () => {
  it('closes the HTTP server and resources once for repeated signals', async () => {
    const server = createCloseableServer();
    const closeResources = vi.fn(() => Promise.resolve());
    const forceExit = vi.fn();
    const shutdown = createShutdown({ closeResources, forceExit, server });

    const firstShutdown = shutdown('SIGTERM');
    const repeatedShutdown = shutdown('SIGINT');
    await Promise.all([firstShutdown, repeatedShutdown]);

    expect(repeatedShutdown).toBe(firstShutdown);
    expect(closeResources).toHaveBeenCalledOnce();
    expect(forceExit).not.toHaveBeenCalled();
  });

  it('sets a failing exit code when closing resources fails', async () => {
    const previousExitCode = process.exitCode;
    const server = createCloseableServer();
    const shutdown = createShutdown({
      closeResources: () => Promise.reject(new Error('disconnect failed')),
      forceExit: vi.fn(),
      server,
    });

    await shutdown('SIGTERM');

    expect(process.exitCode).toBe(1);
    process.exitCode = previousExitCode;
  });
});

describe('HTTP server composition', () => {
  it('rejects E2E provider injection outside an isolated test environment', () => {
    expect(() => createE2eHttpServer({ ...source, DATABASE_LABEL: 'development' }, fakeProvider()))
      .toThrow('The E2E server requires NODE_ENV=test and an isolated test database.');
  });

  it('builds the E2E server with the injected fake provider and exposes shutdown', async () => {
    const built = createE2eHttpServer(source, fakeProvider());

    expect(built.server).toBeDefined();
    await expect(built.shutdownSummaryTasks()).resolves.toBeUndefined();
  });
});
