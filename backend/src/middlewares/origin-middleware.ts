import type { RequestHandler } from 'express';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function rejectOrigin(response: Parameters<RequestHandler>[1]): void {
  response.status(403).json({
    error: {
      code: 'ORIGIN_FORBIDDEN',
      field: null,
      message: 'A origem desta solicitação não é permitida.',
      retryAfterSeconds: null,
    },
  });
}

function rejectContentType(response: Parameters<RequestHandler>[1]): void {
  response.status(415).json({
    error: {
      code: 'INVALID_INPUT',
      field: null,
      message: 'O conteúdo da solicitação deve ser JSON.',
      retryAfterSeconds: null,
    },
  });
}

export function createOriginMiddleware(publicAppUrl: string): RequestHandler {
  const allowedOrigin = new URL(publicAppUrl).origin;

  return (request, response, next) => {
    if (!UNSAFE_METHODS.has(request.method)) {
      next();
      return;
    }

    if (request.get('origin') !== allowedOrigin) {
      rejectOrigin(response);
      return;
    }

    if (!request.is('application/json')) {
      rejectContentType(response);
      return;
    }

    next();
  };
}
