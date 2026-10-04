import type { RequestHandler } from 'express';

export function validateBody<TData>(parse: (input: unknown) => TData): RequestHandler {
  return function validate(request, _response, next): void {
    try {
      request.body = parse(request.body);
      next();
    } catch (error: unknown) {
      next(error);
    }
  };
}
