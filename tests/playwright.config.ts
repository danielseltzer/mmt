import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for MMT E2E Tests
 * ==========================================
 * 
 * Running Tests:
 * --------------
 * Default (headless):           pnpm test:e2e
 * With browser visible:         PWDEBUG=1 pnpm test:e2e
 * Debug specific test:          pnpm test:e2e --project=chromium-debug
 * Run specific test file:       pnpm test:e2e path/to/test.spec.ts
 * 
 * Headless Mode Behavior:
 * -----------------------
 * - Tests run headless by default for speed and CI compatibility
 * - Set PWDEBUG=1 environment variable to show browser window
 * - The chromium-debug project always shows browser (for debugging)
 * 
 * See https://playwright.dev/docs/test-configuration for more details
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
    
    /* Screenshot on failure for debugging */
    screenshot: 'only-on-failure',
  },

  /* Configure different test scenarios as projects */
  projects: [
    /**
     * Default Project: chromium
     * -------------------------
     * Standard test configuration for CI and local development
     * Runs headless by default, respects PWDEBUG environment variable
     */
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Headless mode controlled by PWDEBUG environment variable
        headless: process.env.PWDEBUG !== '1',
      },
    },

    /**
     * Debug Project: chromium-debug
     * ------------------------------
     * For interactive debugging with visible browser
     * Use: pnpm test:e2e --project=chromium-debug
     * Features:
     * - Browser always visible
     * - Video recording on failure
     * - Single worker, no parallel execution
     * - Extended timeout for debugging
     */
    {
      name: 'chromium-debug',
      use: {
        ...devices['Desktop Chrome'],
        headless: false,  // Always show browser for debugging
        video: 'retain-on-failure',
        launchOptions: {
          slowMo: 100,  // Slow down actions by 100ms for visibility
        },
      },
      fullyParallel: false,
      workers: 1,
      retries: 0,
      timeout: 60000,  // 60 second timeout for debugging
    },

    /**
     * Additional Browser Projects (Uncomment to enable)
     * --------------------------------------------------
     */
    
    // Firefox testing
    // {
    //   name: 'firefox',
    //   use: { 
    //     ...devices['Desktop Firefox'],
    //     headless: process.env.PWDEBUG !== '1',
    //   },
    // },
    
    // WebKit/Safari testing
    // {
    //   name: 'webkit',
    //   use: { 
    //     ...devices['Desktop Safari'],
    //     headless: process.env.PWDEBUG !== '1',
    //   },
    // },
  ],
  
  /* Test output directory */
  outputDir: '../test-results/',
});