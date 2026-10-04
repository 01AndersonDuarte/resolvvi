import { cnjFormatInvalid, cnjRequired } from '../errors/process-errors.js';

const DIGITS_PATTERN = /^[0-9]{20}$/;
const MASKED_PATTERN = /^[0-9]{7}-[0-9]{2}\.[0-9]{4}\.[0-9]\.[0-9]{2}\.[0-9]{4}$/;

export function normalizeCnjInput(value: string): string {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) throw cnjRequired();

  const digits = toDigits(trimmedValue);
  if (!digits) throw cnjFormatInvalid();

  return formatCnj(digits);
}

function toDigits(value: string): string | null {
  if (DIGITS_PATTERN.test(value)) return value;
  if (!MASKED_PATTERN.test(value)) return null;

  return value.replaceAll('-', '').replaceAll('.', '');
}

function formatCnj(digits: string): string {
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
}
