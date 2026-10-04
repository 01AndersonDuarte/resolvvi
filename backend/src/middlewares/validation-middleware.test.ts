import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { validateBody } from './validation-middleware.js';

describe('validateBody', () => {
  it('replaces the request body with the parsed value before continuing', () => {
    const request = { body: { email: ' Person@Example.Test ' } } as Request;
    const response = {} as Response;
    const next = vi.fn<(error?: unknown) => void>();
    const parser = vi.fn((input: unknown) => ({
      email: String((input as { email: string }).email).trim().toLowerCase(),
    }));

    validateBody(parser)(request, response, next);

    expect(request.body).toEqual({ email: 'person@example.test' });
    expect(parser).toHaveBeenCalledWith({ email: ' Person@Example.Test ' });
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it('passes validation errors to the error middleware', () => {
    const request = { body: { email: 'invalid' } } as Request;
    const response = {} as Response;
    const next = vi.fn<(error?: unknown) => void>();
    const validationError = new Error('invalid input');
    const parse = vi.fn(() => { throw validationError; });

    validateBody(parse)(request, response, next);

    expect(request.body).toEqual({ email: 'invalid' });
    expect(next).toHaveBeenCalledWith(validationError);
  });
});
