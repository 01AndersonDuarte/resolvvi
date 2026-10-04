import { cnjFormatInvalid, cnjRequired, movementPageInvalid, processIdInvalid } from '../errors/process-errors.js';
import type { CnjInput, MovementPageRequest } from '../types/process.js';

const PROCESS_ID_PATTERN = /^[1-9][0-9]*$/;
const MAX_PROCESS_ID = 2_147_483_647;
const PAGE_PATTERN = /^[1-9][0-9]*$/;
const MAX_PAGE = 2_147_483_647;

export function parseCnjInput(input: unknown): CnjInput {
  if (!isObject(input) || Object.keys(input).length !== 1 || typeof input.cnj !== 'string') {
    throw cnjFormatInvalid();
  }
  if (input.cnj.trim().length === 0) throw cnjRequired();

  return { cnj: input.cnj };
}

export function parseProcessId(input: unknown): number {
  if (typeof input !== 'string' || !PROCESS_ID_PATTERN.test(input)) throw processIdInvalid();

  const id = Number(input);
  if (!Number.isSafeInteger(id) || id > MAX_PROCESS_ID) throw processIdInvalid();

  return id;
}

export function parseMovementPageRequest(input: MovementPageRequest): { id: number; page: number } {
  const id = parseProcessId(input.id);
  const query = input.query;
  if (!isObject(query) || Object.keys(query).some((key) => key !== 'page') || Object.keys(query).length > 1) {
    throw movementPageInvalid();
  }

  const rawPage = query.page;
  if (rawPage === undefined) return { id, page: 1 };
  if (typeof rawPage !== 'string' || !PAGE_PATTERN.test(rawPage)) throw movementPageInvalid();

  const page = Number(rawPage);
  if (!Number.isSafeInteger(page) || page > MAX_PAGE) throw movementPageInvalid();

  return { id, page };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
