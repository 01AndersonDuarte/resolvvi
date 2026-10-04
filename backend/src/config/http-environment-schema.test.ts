import { describe, expect, it } from 'vitest';

import { parseHttpEnvironment } from './http-environment-schema.js';

describe('parseHttpEnvironment', () => {
  it('normalizes a valid application origin and defaults the port', () => {
    const result = parseHttpEnvironment({ PUBLIC_APP_URL: 'http://localhost:5173/' });

    expect(result).toEqual({ port: 3000, publicAppUrl: 'http://localhost:5173' });
  });

  it.each([
    {},
    { PORT: '0', PUBLIC_APP_URL: 'http://localhost:5173' },
    { PUBLIC_APP_URL: 'https://user:pass@example.com' },
    { PUBLIC_APP_URL: 'https://example.com/app' },
    { NODE_ENV: 'production', PUBLIC_APP_URL: 'http://example.com' },
    { PUBLIC_APP_URL: 'not a url' },
  ])('rejects invalid HTTP configuration %#', (source) => {
    expect(() => parseHttpEnvironment(source)).toThrow('Configuração inválida');
  });
});
