import dotenv from 'dotenv';

import type { ApplicationEnvironment } from '../protocols.js';
import { parseEnvironment } from './environment-schema.js';

const DEFAULT_NODE_ENVIRONMENT = 'development';

function loadEnvironment(): ApplicationEnvironment {
  const nodeEnvironment = process.env.NODE_ENV ?? DEFAULT_NODE_ENVIRONMENT;
  const environmentFile = `.env.${nodeEnvironment}`;
  dotenv.config({ path: environmentFile, quiet: true });

  return parseEnvironment(process.env);
}

export const env = loadEnvironment();
