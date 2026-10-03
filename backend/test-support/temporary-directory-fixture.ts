import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TEMPORARY_DIRECTORY_PREFIX = join(tmpdir(), 'harness-import-test-');

export async function createTemporaryTestDirectory(): Promise<string> {
  return mkdtemp(TEMPORARY_DIRECTORY_PREFIX);
}

export async function removeTemporaryTestDirectory(directory: string): Promise<void> {
  if (!directory.startsWith(TEMPORARY_DIRECTORY_PREFIX)) {
    throw new Error('Diretório fora da área temporária de testes.');
  }

  await rm(directory, { force: true, recursive: true });
}

