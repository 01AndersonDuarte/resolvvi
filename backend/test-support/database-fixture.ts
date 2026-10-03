const TEST_DATABASE_PREFIX = 'harness_test_';
const SAFE_DATABASE_NAME = /^[a-z0-9_]+$/;

export type DatabaseAdministrator = {
  query: (statement: string) => Promise<unknown>;
};

type TestDatabaseNameInput = {
  runId: string;
  workerIndex: number;
};

export function createTestDatabaseName(input: TestDatabaseNameInput): string {
  const runId = input.runId.toLowerCase().replaceAll(/[^a-z0-9]/g, '').slice(0, 24);
  if (runId.length === 0 || !Number.isSafeInteger(input.workerIndex) || input.workerIndex < 0) {
    throw new Error('Identificador de banco de teste inválido.');
  }

  return `${TEST_DATABASE_PREFIX}${runId}_w${input.workerIndex}`;
}

export function assertTestDatabaseName(databaseName: string): void {
  if (!databaseName.startsWith(TEST_DATABASE_PREFIX) || !SAFE_DATABASE_NAME.test(databaseName)) {
    throw new Error('Operação permitida somente em banco explicitamente identificado como teste.');
  }
}

function quotedIdentifier(databaseName: string): string {
  assertTestDatabaseName(databaseName);
  return `"${databaseName}"`;
}

export async function createTestDatabase(
  administrator: DatabaseAdministrator,
  databaseName: string,
): Promise<void> {
  await administrator.query(`CREATE DATABASE ${quotedIdentifier(databaseName)}`);
}

export async function dropTestDatabase(
  administrator: DatabaseAdministrator,
  databaseName: string,
): Promise<void> {
  await administrator.query(`DROP DATABASE IF EXISTS ${quotedIdentifier(databaseName)} WITH (FORCE)`);
}

