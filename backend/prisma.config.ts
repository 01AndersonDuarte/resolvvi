import { defineConfig } from 'prisma/config';

import { env } from './src/config/envs.js';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env.databaseUrl },
});
