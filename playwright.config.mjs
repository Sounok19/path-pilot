import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  globalTeardown: './scripts/browser-teardown.mjs',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: `"${process.execPath}" scripts/test-server.mjs`,
    url: 'http://127.0.0.1:3100/api/health',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
