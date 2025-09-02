import { test, expect } from '@playwright/test';

test.describe('Preview Modal - Double Click', () => {
  test('Double-clicking a row opens the Preview modal', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for tabs to load
    await page.waitForSelector('[data-testid^="tab-trigger-"]', { timeout: 15000 });
    
    // Click on the first tab
    const firstTab = page.locator('[data-testid^="tab-trigger-"]').first();
    await firstTab.click();
    
    // Wait for table rows to load
    await page.waitForSelector('[data-testid^="row-"]', { timeout: 15000 });
    
    // Get the first document row
    const firstRow = page.locator('[data-testid^="row-"]').first();
    
    // Double-click the row
    await firstRow.dblclick();
    
    // Verify the Preview modal opens
    const modalHeader = page.locator('h2:has-text("Document Preview")');
    await expect(modalHeader).toBeVisible({ timeout: 5000 });
    
    // Verify content is loaded (wait for pre element with content)
    const previewContent = page.locator('pre');
    await expect(previewContent).toBeVisible({ timeout: 10000 });
    
    // Get the content to verify it's actually loaded
    const modalContent = await previewContent.textContent();
    expect(modalContent).toBeTruthy();
    expect(modalContent?.length).toBeGreaterThan(0);
    
    console.log('✅ Double-click opens Preview modal with content');
    
    // Close the modal with Escape
    await page.keyboard.press('Escape');
    await expect(modalHeader).not.toBeVisible({ timeout: 5000 });
    
    console.log('✅ Modal closes with Escape key');
  });
});