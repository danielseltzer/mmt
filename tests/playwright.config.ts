import { defineConfig, devices } from '@playwright/test';

/**
 * Consolidated Playwright configuration for MMT E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Global setup to start/stop services */
  globalSetup: './e2e/global-setup.ts',
  
  /* Run tests in files in parallel by default */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL for the web app */
    baseURL: 'http://localhost:5173',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Run in headless mode by default, override with PWDEBUG=1 for debugging */
    headless: !process.env.PWDEBUG,
  },

  /* Configure different test scenarios as projects */
  projects: [
    // Default: Full test suite with standard settings
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        headless: !process.env.PWDEBUG
      },
    },

    // Simple: Non-parallel execution for debugging
    // NOTE: This configuration appears to be unused currently
    // Originally from playwright-simple.config.ts
    {
      name: 'chromium-debug',
      testDir: './e2e/web',
      use: {
        ...devices['Desktop Chrome'],
        headless: !process.env.PWDEBUG,
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
      },
      fullyParallel: false,
      workers: 1,
      retries: 0,
      timeout: 30000,
    },

    // Web-specific: Used by scripts/test-web-e2e.js for specific test file
    // NOTE: This configuration may be unused - originally filtered for simple-app.spec.ts
    // Originally from playwright-web.config.ts
    {
      name: 'chromium-web',
      testDir: './e2e/web',
      testMatch: '**/simple-app.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        headless: !process.env.PWDEBUG,
        video: 'on-first-retry',
        screenshot: 'only-on-failure',
      },
      fullyParallel: false,
      workers: 1,
      retries: 0,
      timeout: 30000,
    },

    // Additional browser testing (commented out by default)
    /* Uncomment to test on other browsers:
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */

    /* Test against mobile viewports */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],
  
  /* Test output directory */
  outputDir: '../test-results/',
});