import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Explicitly set headless mode (override with PWDEBUG=1 for debugging)
    headless: !process.env.PWDEBUG,
  },
  webServer: {
    command: 'pnpm dev',
    port: 5173,
    timeout: 120000,
    reuseExistingServer: true,
  },
});