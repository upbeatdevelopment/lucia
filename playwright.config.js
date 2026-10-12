import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const systemChrome = '/run/current-system/sw/bin/google-chrome';
const externalURL = process.env.PIANO_TEST_URL;
export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 1,
  use: {
    baseURL: externalURL || 'http://localhost:4180',
    viewport: { width: 1440, height: 1050 },
    launchOptions: { executablePath: process.env.CHROME_PATH || (existsSync(systemChrome) ? systemChrome : undefined) },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: externalURL ? undefined : { command: 'PORT=4180 DB_PATH=test-results/history.sqlite node server.js', url: 'http://localhost:4180', reuseExistingServer: false },
});
