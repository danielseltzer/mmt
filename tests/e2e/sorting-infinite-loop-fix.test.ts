import { test, expect } from '@playwright/test';

test.describe('Sorting Infinite Loop Fix', () => {
  test('should not cause infinite loop when clicking sort', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for the document table to load
    await page.waitForSelector('[data-testid="document-table"]', { 
      timeout: 10000,
      state: 'visible' 
    });
    
    // Monitor network activity to detect infinite loops
    let documentsFetchCount = 0;
    page.on('request', request => {
      if (request.url().includes('/api/vaults/') && request.url().includes('/documents')) {
        documentsFetchCount++;
        console.log(`Documents fetch #${documentsFetchCount}: ${request.url()}`);
      }
    });
    
    // Click on a sortable column header
    const nameHeader = page.locator('[data-testid="column-header-name"]');
    await nameHeader.waitFor({ state: 'visible' });
    
    // Reset counter before clicking
    documentsFetchCount = 0;
    
    // Click to sort
    await nameHeader.click();
    
    // Wait a bit to see if multiple requests are made
    await page.waitForTimeout(2000);
    
    // Verify only one fetch was made (or at most 2 for initial load + sort)
    expect(documentsFetchCount).toBeLessThanOrEqual(2);
    console.log(`Total documents fetches after sort click: ${documentsFetchCount}`);
    
    // Click again to reverse sort
    documentsFetchCount = 0;
    await nameHeader.click();
    await page.waitForTimeout(2000);
    
    // Again, should only trigger one fetch
    expect(documentsFetchCount).toBeLessThanOrEqual(1);
    console.log(`Total documents fetches after second sort click: ${documentsFetchCount}`);
    
    // Verify the UI is still responsive
    const rows = page.locator('[data-testid^="row-"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    
    // Check console for our debug logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'debug' || msg.type() === 'log') {
        const text = msg.text();
        if (text.includes('TableView:') || text.includes('DocumentStore:')) {
          consoleLogs.push(text);
        }
      }
    });
    
    // One more sort to capture logs
    documentsFetchCount = 0;
    await nameHeader.click();
    await page.waitForTimeout(1000);
    
    // Print captured logs for debugging
    console.log('Debug logs captured:');
    consoleLogs.forEach(log => console.log('  ', log));
    
    // Final check - no infinite loop
    expect(documentsFetchCount).toBeLessThanOrEqual(1);
  });
  
  test('should handle rapid sort clicks without infinite loops', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for the document table
    await page.waitForSelector('[data-testid="document-table"]', { 
      timeout: 10000,
      state: 'visible' 
    });
    
    let documentsFetchCount = 0;
    page.on('request', request => {
      if (request.url().includes('/api/vaults/') && request.url().includes('/documents')) {
        documentsFetchCount++;
      }
    });
    
    const nameHeader = page.locator('[data-testid="column-header-name"]');
    await nameHeader.waitFor({ state: 'visible' });
    
    // Reset counter
    documentsFetchCount = 0;
    
    // Rapidly click the sort header multiple times
    for (let i = 0; i < 5; i++) {
      await nameHeader.click();
      await page.waitForTimeout(100); // Small delay between clicks
    }
    
    // Wait for any pending requests to complete
    await page.waitForTimeout(2000);
    
    // Even with 5 clicks, we shouldn't have more than 5 fetches
    // (ideally it should be exactly 5 or less if debounced)
    expect(documentsFetchCount).toBeLessThanOrEqual(6);
    console.log(`Total fetches after 5 rapid clicks: ${documentsFetchCount}`);
    
    // Verify the app is still functional
    const rows = page.locator('[data-testid^="row-"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });
});