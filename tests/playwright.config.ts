import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for MMT E2E Tests
 * ==========================================
 * 
 * HEADLESS MODE CONTROL:
 * ----------------------
 * The `headless: true` setting in the global `use` object below
 * is the SINGLE control point for all test projects.
 * Tests will ALWAYS run without visible browser windows.
 * 
 * Running Tests:
 * --------------
 * Default (headless):           pnpm test:e2e
 * With browser visible:         pnpm test:e2e:debug (uses separate config)
 * Run specific test file:       pnpm test:e2e path/to/test.spec.ts
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
    
    /* ALWAYS run headless - this is the single control point */
    headless: true,
    
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
     * Inherits headless: true from global use configuration
     */
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Inherits headless: true from global config
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
     * 
     * NOTE: This project is excluded from default test runs.
     * Must be explicitly selected with --project=chromium-debug
     */
    // Uncomment to enable debug project or use --project=chromium-debug
    // {
    //   name: 'chromium-debug',
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     headless: false,  // Always show browser for debugging
    //     video: 'retain-on-failure',
    //     launchOptions: {
    //       slowMo: 100,  // Slow down actions by 100ms for visibility
    //     },
    //   },
    //   fullyParallel: false,
    //   workers: 1,
    //   retries: 0,
    //   timeout: 60000,  // 60 second timeout for debugging
    // },

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