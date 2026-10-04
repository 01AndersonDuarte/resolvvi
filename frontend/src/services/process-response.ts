import { MOVEMENT_PAGE_SIZE, type MovementPage } from '../types/movement-page';
import type { Movement } from '../types/movement';
import type { ProcessDetails } from '../types/process-details';

const CNJ_PATTERN = /^[0-9]{7}-[0-9]{2}\.[0-9]{4}\.[0-9]\.[0-9]{2}\.[0-9]{4}$/;
const CIVIL_DATE_PATTERN = /^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/;

export function readProcessDetails(value: unknown, requestedId: string): ProcessDetails {
  if (!isRecord(value) || !isPositiveInteger(value.id) || value.id !== Number(requestedId) ||
    typeof value.cnj !== 'string' || !CNJ_PATTERN.test(value.cnj) ||
    !isNullableString(value.forum) || !isNullableString(value.court) ||
    !isNullableString(value.lawsuitValue) || !isNullableNonNegativeInteger(value.numberOfAuthors)) {
    throw new Error('Resposta de detalhes processuais inválida.');
  }

  return {
    id: value.id,
    cnj: value.cnj,
    forum: value.forum,
    court: value.court,
    lawsuitValue: value.lawsuitValue,
    numberOfAuthors: value.numberOfAuthors,
  };
}

export function readMovementPage(value: unknown, input: { processId: number; page: number }): MovementPage {
  if (!isRecord(value) || value.processId !== input.processId || value.page !== input.page ||
    value.pageSize !== MOVEMENT_PAGE_SIZE || !isNonNegativeInteger(value.total) ||
    !isNonNegativeInteger(value.totalPages) || value.totalPages !== Math.ceil(value.total / MOVEMENT_PAGE_SIZE) ||
    !Array.isArray(value.items) || value.items.length > MOVEMENT_PAGE_SIZE ||
    !hasExpectedItemCount(value.items.length, value.total, input.page)) {
    throw new Error('Resposta de movimentações inválida.');
  }

  const items = value.items.map(readMovement);
  if (hasDuplicateIds(items)) throw new Error('Resposta de movimentações inválida.');

  return {
    processId: value.processId,
    items,
    page: value.page,
    pageSize: MOVEMENT_PAGE_SIZE,
    total: value.total,
    totalPages: value.totalPages,
  };
}

function readMovement(value: unknown): Movement {
  if (!isRecord(value) || !isPositiveInteger(value.id) ||
    !isNullableDate(value.movementDate) || !isNullableString(value.movementTitle) ||
    !isNullableString(value.movementContent)) {
    throw new Error('Resposta de movimentações inválida.');
  }

  return {
    id: value.id,
    movementDate: value.movementDate,
    movementTitle: value.movementTitle,
    movementContent: value.movementContent,
  };
}

function hasExpectedItemCount(count: number, total: number, page: number): boolean {
  if (page > Math.max(1, Math.ceil(total / MOVEMENT_PAGE_SIZE))) return false;
  return count === Math.min(MOVEMENT_PAGE_SIZE, Math.max(0, total - ((page - 1) * MOVEMENT_PAGE_SIZE)));
}

function hasDuplicateIds(items: Movement[]): boolean {
  return new Set(items.map((item) => item.id)).size !== items.length;
}

function isNullableDate(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && isValidCivilDate(value));
}

function isValidCivilDate(value: string): boolean {
  if (!CIVIL_DATE_PATTERN.test(value)) return false;
  const [day, month, year] = value.split('/').map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 0));
  return date.getUTCDate() === day && date.getUTCMonth() + 1 === month && date.getUTCFullYear() === year;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableNonNegativeInteger(value: unknown): value is number | null {
  return value === null || isNonNegativeInteger(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
