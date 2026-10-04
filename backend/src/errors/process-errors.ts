import { ApplicationError } from './application-error.js';

export function cnjRequired(): ApplicationError {
  return new ApplicationError({
    code: 'CNJ_REQUIRED',
    message: 'Informe o número do processo.',
    status: 400,
    field: 'cnj',
  });
}

export function cnjFormatInvalid(): ApplicationError {
  return new ApplicationError({
    code: 'CNJ_FORMAT_INVALID',
    message: 'Confira o formato: digite os 20 números do processo, com ou sem pontos e traço.',
    status: 400,
    field: 'cnj',
  });
}

export function processNotFound(): ApplicationError {
  return new ApplicationError({
    code: 'PROCESS_NOT_FOUND',
    message: 'Não encontramos esse processo na base disponível. Confira o número e tente novamente.',
    status: 404,
  });
}

export function processIdInvalid(): ApplicationError {
  return new ApplicationError({
    code: 'INVALID_INPUT',
    message: 'O endereço do processo é inválido.',
    status: 400,
  });
}

export function processServiceUnavailable(): ApplicationError {
  return new ApplicationError({
    code: 'SERVICE_UNAVAILABLE',
    message: 'Não foi possível concluir a consulta agora. Tente novamente.',
    status: 503,
  });
}
