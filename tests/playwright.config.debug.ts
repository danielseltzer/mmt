import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Debug Configuration
 * ===============================
 * 
 * This configuration is for interactive debugging with visible browser.
 * Use this when you need to see what's happening during test execution.
 * 
 * Usage:
 * ------
 * pnpm test:e2e:debug
 * 
 * Features:
 * ---------
 * - Browser window always visible
 * - Slower execution for better visibility
 * - Video recording on failure
 * - Extended timeouts for debugging
 * - Single worker (no parallel execution)
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  
  fullyParallel: false,  // No parallel execution for debugging
  workers: 1,            // Single worker
  retries: 0,            // No retries in debug mode
  timeout: 60000,        // 60 second timeout for debugging
  
  reporter: 'line',      // Simple line reporter for clarity
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',          // Always capture trace
    screenshot: 'on',      // Always capture screenshots
    video: 'on',           // Always record video
    
    // Browser configuration
    ...devices['Desktop Chrome'],
    headless: false,       // Always show browser
    
    // Slow down actions for visibility
    launchOptions: {
      slowMo: 300,        // 300ms delay between actions
    },
    
    // Viewport for debugging
    viewport: { width: 1280, height: 720 },
  },
  
  outputDir: '../test-results-debug/',
});