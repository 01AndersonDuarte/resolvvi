import type { Server } from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import { createHttpServer } from './server.js';
import { createShutdown } from './shutdown.js';

it('validates HTTP settings before creating a server that can listen', () => {
  expect(() => createHttpServer({})).toThrow('Configuração inválida');

  const server = createHttpServer({ PORT: '3000', PUBLIC_APP_URL: 'http://localhost:5173' });

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

function createCloseableServer(): Server {
  return { close: (callback?: (error?: Error) => void) => callback?.() } as unknown as Server;
}
