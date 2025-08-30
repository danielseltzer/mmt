import { test, expect } from '@playwright/test';

test.describe('Hanging Issues', () => {
  test('vault status should not hang on loading', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for initial page load
    await page.waitForTimeout(2000);
    
    // Check for "Loading status..." text that shouldn't be there after 2 seconds
    const loadingStatus = await page.locator('text="Loading status..."').count();
    expect(loadingStatus).toBe(0);
  });
  
  test('document sorting should not hang', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for initial page load
    await page.waitForTimeout(2000);
    
    // Check for "Loading documents..." text
    const loadingDocs = await page.locator('text="Loading documents..."').count();
    expect(loadingDocs).toBe(0);
    
    // Try to find and click sort button if it exists
    const sortButton = page.locator('[aria-label*="Sort"]').first();
    if (await sortButton.isVisible()) {
      await sortButton.click();
      await page.waitForTimeout(1000);
      
      // Check again - should not be loading
      const loadingAfterSort = await page.locator('text="Loading documents..."').count();
      expect(loadingAfterSort).toBe(0);
    }
  });
  
  test('switching tabs should not cause hanging', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Find all vault tabs
    const tabs = await page.locator('[role="tab"]').all();
    
    if (tabs.length > 1) {
      // Click on second tab
      await tabs[1].click();
      await page.waitForTimeout(1000);
      
      // Should not show loading status
      const loadingStatus = await page.locator('text="Loading status..."').count();
      expect(loadingStatus).toBe(0);
      
      // Should not show loading documents
      const loadingDocs = await page.locator('text="Loading documents..."').count();
      expect(loadingDocs).toBe(0);
    }
  });
});