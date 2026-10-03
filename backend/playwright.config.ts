import { defineConfig } from '@playwright/test';

export default defineConfig({
  forbidOnly: true,
  fullyParallel: true,
  outputDir: 'test-results',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  retries: 0,
  testDir: '../e2e',
  timeout: 60_000,
});

