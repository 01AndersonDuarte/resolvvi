import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

import { requestContextMiddleware, type RequestContext } from './request-context-middleware.js';

afterEach(() => vi.useRealTimers());

describe('requestContextMiddleware', () => {
  it('marks an expired request and sends a safe timeout response', async () => {
    vi.useFakeTimers();
    const response = makeResponse();
    const next = vi.fn();

    requestContextMiddleware({} as Request, response.httpResponse, next);
    await vi.advanceTimersByTimeAsync(12_000);

    expect(next).toHaveBeenCalledOnce();
    expect(response.context.timedOut).toBe(true);
    expect(response.status).toHaveBeenCalledWith(504);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'REQUEST_TIMEOUT',
        field: null,
        message: 'A solicitação demorou mais do que o esperado. Tente novamente.',
        retryAfterSeconds: null,
      },
    });
  });
});

function makeResponse(): {
  context: RequestContext;
  httpResponse: Response;
  json: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
} {
  const listeners = new Map<string, () => void>();
  const locals = {} as { requestContext: RequestContext };
  const json = vi.fn();
  const status = vi.fn();
  const response = {
    headersSent: false,
    json,
    locals,
    once: vi.fn((event: string, callback: () => void) => listeners.set(event, callback)),
    setHeader: vi.fn(),
    status: vi.fn((code: number) => {
      status(code);
      return response;
    }),
  };

  return {
    get context() { return locals.requestContext; },
    httpResponse: response as unknown as Response,
    json,
    status,
  };
}
