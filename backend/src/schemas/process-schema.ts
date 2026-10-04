import { cnjFormatInvalid, cnjRequired } from '../errors/process-errors.js';
import type { CnjInput } from '../types/process.js';

export function parseCnjInput(input: unknown): CnjInput {
  if (!isObject(input) || Object.keys(input).length !== 1 || typeof input.cnj !== 'string') {
    throw cnjFormatInvalid();
  }
  if (input.cnj.trim().length === 0) throw cnjRequired();

  return { cnj: input.cnj };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
