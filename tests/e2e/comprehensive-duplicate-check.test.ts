import { test, expect } from '@playwright/test';

test.describe('Comprehensive Duplicate Check', () => {
  test('multiple tab switches should not create duplicates', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Get tabs
    const tabs = await page.locator('[role="tab"]').all();
    console.log(`Found ${tabs.length} tabs`);
    
    if (tabs.length >= 2) {
      // Switch between tabs multiple times
      for (let i = 0; i < 10; i++) {
        await tabs[i % tabs.length].click();
        await page.waitForTimeout(200);
      }
      
      // Go back to first tab
      await tabs[0].click();
      await page.waitForTimeout(1000);
      
      // Check for duplicates
      const rows = await page.locator('tbody tr').all();
      const paths: string[] = [];
      
      for (const row of rows) {
        const testId = await row.getAttribute('data-testid');
        if (testId && testId.startsWith('row-')) {
          paths.push(testId.substring(4));
        }
      }
      
      const uniquePaths = new Set(paths);
      expect(paths.length).toBe(uniquePaths.size);
      console.log(`Verified ${paths.length} unique documents after tab switching`);
    }
  });

  test('rapid API calls should not create duplicates', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Trigger multiple fetches by rapidly changing search
    const searchInput = await page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
    
    if (await searchInput.isVisible()) {
      // Type and clear rapidly
      for (let i = 0; i < 5; i++) {
        await searchInput.fill('test');
        await page.waitForTimeout(50);
        await searchInput.clear();
        await page.waitForTimeout(50);
      }
      
      // Wait for debounce to settle
      await page.waitForTimeout(1000);
      
      // Check for duplicates
      const rows = await page.locator('tbody tr').all();
      const paths: string[] = [];
      
      for (const row of rows) {
        const testId = await row.getAttribute('data-testid');
        if (testId && testId.startsWith('row-')) {
          paths.push(testId.substring(4));
        }
      }
      
      const uniquePaths = new Set(paths);
      const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
      
      if (duplicates.length > 0) {
        console.error('Duplicates found:', duplicates);
      }
      
      expect(paths.length).toBe(uniquePaths.size);
      console.log(`Verified ${paths.length} unique documents after rapid searches`);
    }
  });

  test('page refresh should maintain unique documents', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Get initial count
    const initialRows = await page.locator('tbody tr').count();
    console.log(`Initial document count: ${initialRows}`);
    
    // Refresh page
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Check for duplicates after refresh
    const rows = await page.locator('tbody tr').all();
    const paths: string[] = [];
    
    for (const row of rows) {
      const testId = await row.getAttribute('data-testid');
      if (testId && testId.startsWith('row-')) {
        paths.push(testId.substring(4));
      }
    }
    
    const uniquePaths = new Set(paths);
    expect(paths.length).toBe(uniquePaths.size);
    console.log(`Verified ${paths.length} unique documents after refresh`);
  });

  test('verify unique row keys in React table', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Check that all row IDs are unique (important for React rendering)
    const rows = await page.locator('tbody tr[data-testid]').all();
    const rowIds: string[] = [];
    
    for (const row of rows) {
      const id = await row.getAttribute('data-testid');
      if (id) {
        rowIds.push(id);
      }
    }
    
    const uniqueIds = new Set(rowIds);
    expect(rowIds.length).toBe(uniqueIds.size);
    console.log(`All ${rowIds.length} row IDs are unique`);
    
    // Also check that the IDs are based on document paths
    expect(rowIds.length).toBeGreaterThan(0);
    for (const id of rowIds.slice(0, 5)) {
      expect(id).toMatch(/^row-/);
      console.log(`Sample row ID: ${id.substring(0, 50)}...`);
    }
  });
});