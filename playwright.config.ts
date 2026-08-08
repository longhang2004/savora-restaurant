import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'bash scripts/e2e-server.sh',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
