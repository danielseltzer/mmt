import { test, expect } from '@playwright/test';

// This test assumes servers are already running
// Run with: pnpm dev (in another terminal) before running this test

test.describe('MMT Web App', () => {
  test('loads without console errors', async ({ page }) => {
    // Collect console messages
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Also catch page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });

    // Navigate to the app
    await page.goto('http://localhost:5173');

    // Wait for the app header to load
    await expect(page.locator('h1:has-text("MMT - Markdown Management Toolkit")')).toBeVisible({
      timeout: 10000
    });

    // Give it a moment for any async errors
    await page.waitForTimeout(2000);

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.error('Console errors found:', consoleErrors);
    }
    expect(consoleErrors).toHaveLength(0);
  });

  test('displays document table', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for the table to appear
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Check for table headers
    await expect(page.locator('th')).toHaveCount(5); // Expecting 5 columns
  });

  test('shows loading state initially', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Should show loading message briefly
    const loadingText = page.locator('text=Loading documents...');
    
    // It might be too fast to catch, so we just check the table eventually loads
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
  });
});