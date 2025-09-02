import { test, expect } from '@playwright/test';

test.describe('Preview Feature Verification', () => {
  test('Preview appears first in context menu and works correctly', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load - look for tab triggers which indicate vaults are loaded
    await page.waitForSelector('[data-testid^="tab-trigger-"]', { timeout: 10000 });
    
    // Click on the first tab to select a vault
    const firstTab = page.locator('[data-testid^="tab-trigger-"]').first();
    await firstTab.click();
    
    // Wait for table to load
    await page.waitForSelector('[data-testid^="row-"]', { timeout: 10000 });
    
    // Right-click on first row
    const firstRow = page.locator('[data-testid^="row-"]').first();
    await firstRow.click({ button: 'right' });
    
    // Verify context menu appears
    const contextMenu = page.locator('.fixed.bg-background');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });
    
    // Verify Preview is the FIRST option
    const menuButtons = contextMenu.locator('button');
    const firstMenuItem = menuButtons.first();
    await expect(firstMenuItem).toHaveText('Preview');
    
    // Click Preview
    await firstMenuItem.click();
    
    // Verify modal opens
    const modal = page.locator('h2:has-text("Document Preview")');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Wait for content to load (may need time for API call)
    // Look for either the pre element with content or loading indicator
    await page.waitForFunction(
      () => {
        const pre = document.querySelector('pre');
        const loading = document.querySelector('.animate-spin');
        return (pre && pre.textContent && pre.textContent.length > 0) || loading;
      },
      { timeout: 10000 }
    );
    
    // Check if preview content is visible
    const previewContent = page.locator('pre');
    const hasContent = await previewContent.count() > 0;
    if (hasContent) {
      const text = await previewContent.first().textContent();
      console.log(`Preview content loaded: ${text?.substring(0, 50)}...`);
    }
    
    // Test closing with X button
    const closeButton = page.locator('button[aria-label="Close"]');
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await expect(modal).not.toBeVisible();
    } else {
      // Alternative: Press Escape
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
    
    console.log('✅ Preview feature verified successfully');
  });
});