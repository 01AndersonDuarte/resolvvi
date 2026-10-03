import { createDatabaseClient } from './database-client.js';
import { env } from './envs.js';

export const prisma = createDatabaseClient(env.databaseUrl);
