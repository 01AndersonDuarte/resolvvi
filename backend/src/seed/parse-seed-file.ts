import { readFile } from 'node:fs/promises';

import { parseCsvRecords } from './csv-record-parser.js';
import type { SeedProcess } from '../types/seed.js';
import { mapSeedRows } from './seed-row-mapper.js';

export async function parseSeedFile(filePath: string): Promise<SeedProcess[]> {
  const content = await readFile(filePath, 'utf8');

  return mapSeedRows(parseCsvRecords(content));
}
