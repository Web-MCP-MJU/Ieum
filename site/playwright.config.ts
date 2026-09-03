import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://[::1]:3000',
    browserName: 'chromium',
  },
  webServer: {
    command: 'npm run build && npm run start -- --port 3000',
    url: 'http://[::1]:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
