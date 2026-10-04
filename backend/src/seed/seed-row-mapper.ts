import type { SeedMovement, SeedProcess } from '../types/seed.js';

export const SEED_HEADERS = [
  'lawsuit_number',
  'lawsuit_forum',
  'lawsuit_court',
  'lawsuit_value',
  'lawsuit_number_of_authors',
  'movement_date',
  'movement_title',
  'movement_content',
] as const;

const COLUMN_COUNT = SEED_HEADERS.length;
type SeedCsvRow = [string, string, string, string, string, string, string, string];

export function mapSeedRows(rows: string[][]): SeedProcess[] {
  const [headers, ...records] = rows;
  if (!headers || !hasExpectedHeaders(headers)) throw new Error('CSV incompatível com o cabeçalho esperado');

  const processes = new Map<string, SeedProcess>();
  records.forEach((record, index) => addMovement(processes, record, index + 1));

  return [...processes.values()];
}

function hasExpectedHeaders(headers: string[]): boolean {
  return headers.length === COLUMN_COUNT && headers.every((header, index) => header === SEED_HEADERS[index]);
}

function addMovement(processes: Map<string, SeedProcess>, record: string[], sourceOrder: number): void {
  if (record.length !== COLUMN_COUNT) throw new Error(`CSV incompatível na linha lógica ${sourceOrder + 1}`);

  const [cnj, forum, court, value, authors, date, title, content] = record as SeedCsvRow;
  if (!cnj || !forum || !court || !title) throw new Error(`CSV com campo obrigatório vazio na linha ${sourceOrder + 1}`);

  const movement: SeedMovement = {
    movementDate: parseMovementDate(date),
    movementTitle: title,
    movementContent: content === '' ? null : content,
    sourceOrder,
  };
  const process = processes.get(cnj);

  if (process) {
    processes.set(cnj, { ...process, movements: [...process.movements, movement] });
    return;
  }

  processes.set(cnj, {
    cnj,
    forum,
    court,
    lawsuitValue: parseLawsuitValue(value),
    numberOfAuthors: parseAuthorCount(authors),
    movements: [movement],
  });
}

function parseMovementDate(value: string): Date {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!match) throw new Error(`Data de movimentação inválida: ${value}`);

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1 || date.getUTCFullYear() !== year) {
    throw new Error(`Data de movimentação inválida: ${value}`);
  }

  return date;
}

function parseLawsuitValue(value: string): string {
  if (!/^\d{1,3}(?:\.\d{3})*(?:,\d+)?$/.test(value)) {
    throw new Error(`Valor da ação inválido: ${value}`);
  }

  return value.replaceAll('.', '').replace(',', '.');
}

function parseAuthorCount(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error(`Quantidade de autores inválida: ${value}`);

  return Number(value);
}
