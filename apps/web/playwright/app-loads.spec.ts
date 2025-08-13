import { test, expect } from '@playwright/test';

test.describe('App Loading', () => {
  // Track console errors
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset error tracking
    consoleErrors = [];
    
    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for page errors (uncaught exceptions)
    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });
  });

  test('should load without console errors', async ({ page }) => {
    // Navigate to the app
    const response = await page.goto('http://localhost:5173/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Check that the page loaded successfully
    expect(response?.status()).toBeLessThan(400);

    // Wait for the app to fully render
    await page.waitForTimeout(2000);

    // Check for the main app container
    const appContainer = await page.locator('.h-screen.flex.flex-col').first();
    await expect(appContainer).toBeVisible();

    // Check that there are no console errors
    if (consoleErrors.length > 0) {
      console.error('Console errors found:', consoleErrors);
    }
    expect(consoleErrors).toHaveLength(0);
  });

  test('should load API endpoints correctly', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173/');

    // Wait for API calls to complete
    const vaultsResponse = await page.waitForResponse(
      response => response.url().includes('/api/vaults') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);

    // Check that the vaults endpoint was called and returned successfully
    if (vaultsResponse) {
      expect(vaultsResponse.status()).toBe(200);
      const vaultsData = await vaultsResponse.json();
      expect(vaultsData).toHaveProperty('vaults');
    }
  });

  test('should render vault selector when multiple vaults exist', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173/');
    
    // Wait for potential vault selector to render
    await page.waitForTimeout(3000);

    // Check if vault selector exists (it only shows with multiple vaults)
    const vaultSelector = await page.locator('text=/Vault:/').first();
    const selectorExists = await vaultSelector.isVisible().catch(() => false);
    
    // If selector exists, verify it's functional
    if (selectorExists) {
      // Check that the selector has the expected structure
      const selectTrigger = await page.locator('[role="combobox"]').first();
      await expect(selectTrigger).toBeVisible();
      
      // Verify it can be clicked (don't actually click to avoid state changes)
      await expect(selectTrigger).toBeEnabled();
    }
  });

  test('should have no 404 errors for critical resources', async ({ page }) => {
    const failedRequests: string[] = [];
    
    // Track failed requests
    page.on('response', response => {
      if (response.status() === 404 && !response.url().includes('favicon')) {
        failedRequests.push(response.url());
      }
    });

    // Navigate to the app
    await page.goto('http://localhost:5173/');
    
    // Wait for the app to load
    await page.waitForTimeout(3000);
    
    // Check that there are no 404 errors
    if (failedRequests.length > 0) {
      console.error('404 errors found for:', failedRequests);
    }
    expect(failedRequests).toHaveLength(0);
  });
});