import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import dotenv from 'dotenv';

import type { ApplicationEnvironment } from '../protocols.js';
import { parseEnvironment } from './environment-schema.js';

const BACKEND_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DEFAULT_NODE_ENVIRONMENT = 'development';

function loadEnvironment(): ApplicationEnvironment {
  const nodeEnvironment = process.env.NODE_ENV ?? DEFAULT_NODE_ENVIRONMENT;
  const environmentFile = resolve(BACKEND_ROOT, `.env.${nodeEnvironment}`);
  dotenv.config({ path: environmentFile, quiet: true });

  return parseEnvironment(process.env, BACKEND_ROOT);
}

export const env = loadEnvironment();
