import { test, expect } from '@playwright/test';

test.describe('Table Sorting - Infinite Loop Fix', () => {
  test('should sort columns without triggering infinite update loops', async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected 501 errors
        if (!text.includes('501') && !text.includes('Not Implemented')) {
          consoleErrors.push(text);
          
          // Fail immediately if we detect the infinite loop error
          if (text.includes('Maximum update depth exceeded')) {
            throw new Error('INFINITE LOOP DETECTED: Maximum update depth exceeded');
          }
        }
      }
    });
    
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for the document table to load
    await page.waitForSelector('[data-testid="document-table"]', { timeout: 10000 });
    
    // Wait for documents to load
    await page.waitForTimeout(2000);
    
    // Test sorting on different columns
    const columnsToTest = ['name', 'modified', 'size'];
    
    for (const columnId of columnsToTest) {
      const columnHeader = page.locator(`[data-testid="column-header-${columnId}"]`);
      
      // Check if header exists
      const headerExists = await columnHeader.count() > 0;
      if (!headerExists) {
        console.log(`Column ${columnId} not found, skipping`);
        continue;
      }
      
      console.log(`Testing sort on column: ${columnId}`);
      
      // Click to sort ascending
      await columnHeader.click();
      await page.waitForTimeout(500);
      
      // Verify no errors after first click
      expect(consoleErrors).toHaveLength(0);
      
      // Click to sort descending  
      await columnHeader.click();
      await page.waitForTimeout(500);
      
      // Verify no errors after second click
      expect(consoleErrors).toHaveLength(0);
      
      // Click to clear sort (third click)
      await columnHeader.click();
      await page.waitForTimeout(500);
      
      // Verify no errors after third click
      expect(consoleErrors).toHaveLength(0);
    }
    
    // Wait a bit more to catch any delayed errors
    await page.waitForTimeout(1000);
    
    // Final check - no errors should have occurred
    expect(consoleErrors).toHaveLength(0);
  });
  
  test('should maintain sort state when switching between tabs', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="document-table"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Sort by name
    const nameHeader = page.locator('[data-testid="column-header-name"]');
    await nameHeader.click();
    
    // Check for sort indicator
    const sortIndicator = await nameHeader.locator('span:has-text("↑"), span:has-text("↓")').first();
    await expect(sortIndicator).toBeVisible();
    
    // If there are multiple tabs, try switching
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    
    if (tabCount > 1) {
      // Click second tab
      await tabs.nth(1).click();
      await page.waitForTimeout(1000);
      
      // Click back to first tab
      await tabs.nth(0).click();
      await page.waitForTimeout(1000);
      
      // Sort should still be visible
      const sortIndicatorAfterSwitch = await nameHeader.locator('span:has-text("↑"), span:has-text("↓")').first();
      await expect(sortIndicatorAfterSwitch).toBeVisible();
    }
  });
});