import type { RequestFailure } from '../types/api';

const REQUIRED_MESSAGE = 'Informe o número do processo.';
const FORMAT_MESSAGE = 'Confira o formato: digite os 20 números do processo, com ou sem pontos e traço.';
const INVALID_MESSAGE = 'Esse número de processo não é válido. Confira os números e tente novamente.';
const NOT_FOUND_MESSAGE = 'Não encontramos esse processo na base disponível. Confira o número e tente novamente.';
const CONNECTION_MESSAGE = 'Não foi possível conectar. Verifique sua conexão e tente novamente.';
const SERVICE_MESSAGE = 'Não foi possível concluir a consulta agora. Tente novamente.';
const DIGIT_CNJ_PATTERN = /^[0-9]{20}$/;
const MASKED_CNJ_PATTERN = /^[0-9]{7}-[0-9]{2}\.[0-9]{4}\.[0-9]\.[0-9]{2}\.[0-9]{4}$/;

export function validateProcessCnj(cnj: string): string | null {
  const trimmed = cnj.trim();
  if (trimmed.length === 0) return REQUIRED_MESSAGE;
  if (DIGIT_CNJ_PATTERN.test(trimmed) || MASKED_CNJ_PATTERN.test(trimmed)) return null;
  return FORMAT_MESSAGE;
}

export function getProcessInputError(failure: RequestFailure | null): string | null {
  if (failure?.error.code === 'CNJ_REQUIRED') return REQUIRED_MESSAGE;
  if (failure?.error.code === 'CNJ_FORMAT_INVALID') return FORMAT_MESSAGE;
  if (failure?.error.code === 'CNJ_INVALID') return INVALID_MESSAGE;
  return null;
}

export function getProcessSearchError(failure: RequestFailure | null, error: string): string {
  if (failure?.error.code === 'PROCESS_NOT_FOUND') return NOT_FOUND_MESSAGE;
  if (failure === null && error.includes('tempo limite')) return SERVICE_MESSAGE;
  if (failure === null) return CONNECTION_MESSAGE;
  return SERVICE_MESSAGE;
}

export function getProcessDetailsError(failure: RequestFailure | null): string {
  return failure?.error.code === 'PROCESS_NOT_FOUND'
    ? 'Não encontramos esse processo na base disponível.'
    : SERVICE_MESSAGE;
}

export function getProcessMovementsError(failure: RequestFailure | null, error: string): string {
  if (failure?.error.code === 'PROCESS_NOT_FOUND') return NOT_FOUND_MESSAGE;
  if (failure === null && error.includes('tempo limite')) return SERVICE_MESSAGE;
  if (failure === null) return CONNECTION_MESSAGE;
  return SERVICE_MESSAGE;
}
