import { expect, it, vi } from 'vitest';

import { createLogger, logger as defaultLogger } from './logger.js';

const FIXED_TIME = new Date('2026-10-03T12:00:00.000Z');

it('emite eventos estruturados no destino correspondente', () => {
  const stdout = vi.fn();
  const stderr = vi.fn();
  const logger = createLogger({ now: () => FIXED_TIME, stderr, stdout });

  logger.info('Importação iniciada', { runId: 'run-1' });
  logger.error('Importação falhou', new Error('detalhe interno'));

  expect(JSON.parse(String(stdout.mock.calls[0]?.[0]))).toEqual({
    level: 'info',
    message: 'Importação iniciada',
    runId: 'run-1',
    timestamp: FIXED_TIME.toISOString(),
  });
  expect(JSON.parse(String(stderr.mock.calls[0]?.[0]))).toMatchObject({
    error: { name: 'Error' },
    level: 'error',
  });
});

it('remove credenciais, caminhos e detalhes brutos de erros', () => {
  const stdout = vi.fn();
  const logger = createLogger({ now: () => FIXED_TIME, stderr: vi.fn(), stdout });
  const circular: Record<string, unknown> = {};
  circular.self = circular;

  logger.warn('Banco postgresql://admin:secret@localhost indisponível', {
    audit: [new Date('2026-10-03T12:00:00.000Z'), 5n, true, new Error('interno')],
    circular,
    databaseUrl: 'postgresql://admin:secret@localhost/app',
    reportPath: '/private/report.json',
  });

  const output = String(stdout.mock.calls[0]?.[0]);
  expect(output).not.toContain('secret');
  expect(output).not.toContain('/private/report.json');
  expect(JSON.parse(output)).toMatchObject({
    audit: ['2026-10-03T12:00:00.000Z', '5', true, { name: 'Error' }],
    circular: { self: '[CIRCULAR]' },
    databaseUrl: '[REDACTED]',
    reportPath: '[REDACTED]',
  });
});

it('classifica erros desconhecidos sem registrar o valor bruto', () => {
  const stderr = vi.fn();
  const logger = createLogger({ now: () => FIXED_TIME, stderr, stdout: vi.fn() });

  logger.error('Falha inesperada', 'valor bruto confidencial');

  const output = String(stderr.mock.calls[0]?.[0]);
  expect(output).not.toContain('confidencial');
  expect(JSON.parse(output)).toMatchObject({ error: { name: 'UnknownError' } });
});

it('oferece logger padrão nos canais do processo', () => {
  const stdout = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const stderr = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  defaultLogger.info('Informação');
  defaultLogger.error('Falha');

  expect(stdout).toHaveBeenCalledOnce();
  expect(stderr).toHaveBeenCalledOnce();
});
