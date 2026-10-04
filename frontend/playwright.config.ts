import { defineConfig, devices } from '@playwright/test';

const appUrl = process.env.E2E_APP_URL ?? 'http://127.0.0.1:5100';
const appAddress = new URL(appUrl);
const appPort = appAddress.port || '80';
const backendPort = process.env.E2E_API_PORT ?? '3050';
const controlPort = process.env.E2E_CONTROL_PORT ?? '3051';
const databaseUrl = process.env.E2E_DATABASE_URL ??
  'postgresql://dev_test_resolvvi:dev_test_resolvvi@127.0.0.1:55432/dev_test_resolvvi_e2e_test';

export default defineConfig({
  testDir: '../e2e',
  fullyParallel: false,
  reporter: 'list',
  use: { baseURL: appUrl, trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
  webServer: [
    {
      command: 'npm run e2e:harness',
      cwd: '../backend',
      url: `http://127.0.0.1:${backendPort}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        DATABASE_LABEL: 'dev_test_resolvvi_e2e_test',
        DATABASE_URL: databaseUrl,
        PORT: backendPort,
        PUBLIC_APP_URL: appUrl,
        E2E_CONTROL_PORT: controlPort,
      },
    },
    {
      command: `npm run dev -- --host ${appAddress.hostname} --port ${appPort} --strictPort`,
      cwd: '.',
      url: appUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_API_PROXY_TARGET: `http://127.0.0.1:${backendPort}` },
    },
  ],
});
