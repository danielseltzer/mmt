import { test, expect } from '@playwright/test';

test.describe('Document Preview Context Menu', () => {
  test('Preview option appears first in context menu and opens modal', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for vaults to load and click on first vault
    await page.waitForSelector('[data-testid="vault-card"]', { timeout: 10000 });
    await page.click('[data-testid="vault-card"]');
    
    // Wait for table to load with data rows
    await page.waitForSelector('[data-testid^="row-"]', { timeout: 10000 });
    
    // Get first data row
    const firstRow = page.locator('[data-testid^="row-"]').first();
    await expect(firstRow).toBeVisible();
    
    // Right-click on the row to open context menu
    await firstRow.click({ button: 'right' });
    
    // Wait for context menu to appear
    const contextMenu = page.locator('.fixed.bg-background');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });
    
    // Get all menu items
    const menuButtons = contextMenu.locator('button');
    const menuCount = await menuButtons.count();
    expect(menuCount).toBeGreaterThan(0);
    
    // Verify Preview is the first item
    const firstMenuItem = menuButtons.first();
    await expect(firstMenuItem).toHaveText('Preview');
    
    // Click on Preview
    await firstMenuItem.click();
    
    // Wait for modal to appear with title "Document Preview"
    const modal = page.locator('h2:has-text("Document Preview")');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Verify preview content section exists
    const previewContent = page.locator('pre').first();
    await expect(previewContent).toBeVisible();
    
    // Check that some content is loaded (either actual content or loading state)
    const contentText = await previewContent.textContent();
    expect(contentText).toBeDefined();
    
    // Close the modal using the X button or Escape key
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('Preview modal displays document metadata', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for vaults to load and click on first vault
    await page.waitForSelector('[data-testid="vault-card"]', { timeout: 10000 });
    await page.click('[data-testid="vault-card"]');
    
    // Wait for table to load
    await page.waitForSelector('[data-testid^="row-"]', { timeout: 10000 });
    
    // Right-click on first row
    const firstRow = page.locator('[data-testid^="row-"]').first();
    await firstRow.click({ button: 'right' });
    
    // Click Preview in context menu
    await page.locator('button:has-text("Preview")').first().click();
    
    // Wait for modal
    await expect(page.locator('h2:has-text("Document Preview")')).toBeVisible({ timeout: 5000 });
    
    // Check for metadata fields
    const metadataSection = page.locator('.space-y-2').first();
    
    // Look for common metadata fields (at least one should be present)
    const sizeField = metadataSection.locator('text=/Size:/');
    const modifiedField = metadataSection.locator('text=/Modified:/');
    
    // At least one metadata field should be visible
    const hasSizeField = await sizeField.isVisible().catch(() => false);
    const hasModifiedField = await modifiedField.isVisible().catch(() => false);
    
    expect(hasSizeField || hasModifiedField).toBeTruthy();
    
    // Close the modal
    await page.keyboard.press('Escape');
  });
});