import { test, expect } from '@playwright/test';

test.describe('Preview Feature Basic Test', () => {
  test('Preview option appears first in context menu', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for tabs to indicate vaults are loaded
    await page.waitForSelector('[data-testid^="tab-trigger-"]', { timeout: 15000 });
    
    // Click on the first tab to select a vault
    const firstTab = page.locator('[data-testid^="tab-trigger-"]').first();
    await firstTab.click();
    
    // Wait for table rows to load
    await page.waitForSelector('[data-testid^="row-"]', { timeout: 15000 });
    
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
    
    console.log('✅ Preview option is first in context menu');
    
    // Click Preview to test it opens
    await firstMenuItem.click();
    
    // Just verify the modal header appears
    const modalHeader = page.locator('h2:has-text("Document Preview")');
    await expect(modalHeader).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Preview modal opens successfully');
    
    // Close by pressing Escape
    await page.keyboard.press('Escape');
    await expect(modalHeader).not.toBeVisible({ timeout: 5000 });
    
    console.log('✅ Preview modal closes with Escape key');
  });
});