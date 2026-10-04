import type { ErrorRequestHandler } from 'express';

import { logger } from '../config/logger.js';
import { ApplicationError } from '../errors/application-error.js';

const BAD_JSON = 'entity.parse.failed';
const BODY_TOO_LARGE = 'entity.too.large';

type HttpError = Error & { status?: number; type?: string };

function getParserError(error: HttpError): { code: string; message: string; status: number } | undefined {
  if (error.type === BAD_JSON) {
    return { code: 'INVALID_INPUT', message: 'O JSON enviado é inválido.', status: 400 };
  }
  if (error.type === BODY_TOO_LARGE) {
    return { code: 'INVALID_INPUT', message: 'O conteúdo da solicitação excede o limite permitido.', status: 413 };
  }

  return undefined;
}

export const errorMiddleware: ErrorRequestHandler = (error: HttpError, request, response, _next) => {
  void _next;
  if (error instanceof ApplicationError) {
    sendApplicationError(response, error);
    return;
  }
  const parserError = getParserError(error);
  if (parserError) {
    response.status(parserError.status).json({
      error: { code: parserError.code, field: null, message: parserError.message, retryAfterSeconds: null },
    });
    return;
  }

  logger.error('Falha inesperada na requisição HTTP', error, {
    method: request.method,
    route: 'http',
    requestId: response.getHeader('X-Request-Id'),
  });
  if (!response.headersSent) {
    response.status(500).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        field: null,
        message: 'O serviço está temporariamente indisponível. Tente novamente.',
        retryAfterSeconds: null,
      },
    });
  }
};

function sendApplicationError(response: Parameters<ErrorRequestHandler>[2], error: ApplicationError): void {
  if (error.retryAfterSeconds !== null) response.setHeader('Retry-After', error.retryAfterSeconds);
  response.status(error.status).json({
    error: {
      code: error.code,
      field: error.field,
      message: error.message,
      retryAfterSeconds: error.retryAfterSeconds,
    },
  });
}
