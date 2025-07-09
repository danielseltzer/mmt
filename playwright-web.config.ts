import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/web',
  testMatch: '**/simple-app.spec.ts',
  timeout: 30000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
    video: 'on-first-retry',
    headless: true, // Ensure headless mode
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});