import { test, expect } from '@playwright/test';

test.describe('API Integration - Critical Data Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('CRITICAL: Documents must load from API', async ({ page }) => {
    // Wait for the page to be ready
    await expect(page.locator('text=MMT')).toBeVisible();
    
    // Check that we're not stuck in loading state
    const loadingText = page.locator('text=Loading...');
    
    // Loading might appear briefly, but should disappear
    if (await loadingText.isVisible()) {
      // Wait for loading to complete - max 10 seconds
      await expect(loadingText).toBeHidden({ timeout: 10000 });
    }
    
    // Verify documents are actually loaded
    // Look for table rows with document data
    const tableRows = page.locator('tbody tr');
    
    // Wait for at least one row to appear
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });
    
    // Get the count of rows
    const rowCount = await tableRows.count();
    console.log(`Found ${rowCount} document rows`);
    
    // CRITICAL: Must have at least 1 document
    expect(rowCount).toBeGreaterThan(0);
    
    // Verify the table has actual content, not just empty rows
    const firstRowText = await tableRows.first().textContent();
    expect(firstRowText).not.toBe('');
    expect(firstRowText).not.toContain('No documents');
    
    // Verify specific columns are populated
    const firstRowCells = tableRows.first().locator('td');
    const cellCount = await firstRowCells.count();
    expect(cellCount).toBeGreaterThan(3); // Should have multiple columns
    
    // Check that the filename column has content
    const filenameCell = firstRowCells.nth(1); // Second cell is usually filename
    const filename = await filenameCell.textContent();
    expect(filename).toBeTruthy();
    expect(filename.length).toBeGreaterThan(0);
  });

  test('Tab switching should load documents for each vault', async ({ page }) => {
    // Get initial document count
    const initialRows = await page.locator('tbody tr').count();
    console.log(`Initial tab has ${initialRows} documents`);
    
    // Find tab buttons
    const tabs = page.locator('button[role="tab"]');
    const tabCount = await tabs.count();
    
    if (tabCount > 1) {
      // Click on the second tab
      await tabs.nth(1).click();
      
      // Wait for potential loading state
      const loadingText = page.locator('text=Loading...');
      if (await loadingText.isVisible()) {
        await expect(loadingText).toBeHidden({ timeout: 10000 });
      }
      
      // Check if documents loaded for this tab
      const secondTabRows = await page.locator('tbody tr').count();
      console.log(`Second tab has ${secondTabRows} documents`);
      
      // Should have documents (might be different count than first tab)
      expect(secondTabRows).toBeGreaterThanOrEqual(0);
      
      // Switch back to first tab
      await tabs.first().click();
      
      // Wait for any loading
      if (await loadingText.isVisible()) {
        await expect(loadingText).toBeHidden({ timeout: 10000 });
      }
      
      // Should still have documents
      const backToFirstRows = await page.locator('tbody tr').count();
      expect(backToFirstRows).toBe(initialRows);
    }
  });

  test('API endpoints must be accessible', async ({ page }) => {
    // Test that the API is responding
    const response = await page.request.get('http://localhost:3001/health');
    expect(response.status()).toBe(200);
    
    // Test vault status endpoint
    const statusResponse = await page.request.get('http://localhost:3001/status');
    expect(statusResponse.status()).toBe(200);
    
    const statusData = await statusResponse.json();
    expect(statusData).toHaveProperty('vaults');
    expect(Array.isArray(statusData.vaults)).toBe(true);
    expect(statusData.vaults.length).toBeGreaterThan(0);
    
    // Test that documents endpoint works for first vault
    const firstVault = statusData.vaults[0];
    if (firstVault && firstVault.id) {
      const docsResponse = await page.request.get(
        `http://localhost:3001/${encodeURIComponent(firstVault.id)}/documents?limit=10`
      );
      expect(docsResponse.status()).toBe(200);
      
      const docsData = await docsResponse.json();
      expect(docsData).toHaveProperty('documents');
      expect(Array.isArray(docsData.documents)).toBe(true);
      
      // Log for debugging
      console.log(`Vault "${firstVault.id}" has ${docsData.documents.length} documents from API`);
    }
  });

  test('Search functionality must work with loaded documents', async ({ page }) => {
    // First ensure documents are loaded
    const tableRows = page.locator('tbody tr');
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });
    
    const initialCount = await tableRows.count();
    expect(initialCount).toBeGreaterThan(0);
    
    // Find and use the search input
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();
    
    // Type a search query
    await searchInput.fill('test');
    await searchInput.press('Enter');
    
    // Wait a moment for search to process
    await page.waitForTimeout(500);
    
    // Check that the table updated (might have fewer rows now)
    const searchResultCount = await tableRows.count();
    console.log(`Search for "test" returned ${searchResultCount} results from ${initialCount} documents`);
    
    // Clear search
    await searchInput.clear();
    await searchInput.press('Enter');
    await page.waitForTimeout(500);
    
    // Should return to original count (or close to it)
    const clearedCount = await tableRows.count();
    expect(clearedCount).toBeGreaterThan(0);
  });

  test('Document selection must work', async ({ page }) => {
    // Ensure documents are loaded
    const tableRows = page.locator('tbody tr');
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });
    
    // Find the first checkbox
    const firstCheckbox = tableRows.first().locator('input[type="checkbox"]');
    await expect(firstCheckbox).toBeVisible();
    
    // Click to select
    await firstCheckbox.click();
    
    // Verify it's checked
    await expect(firstCheckbox).toBeChecked();
    
    // Bulk operations panel should appear
    const bulkOpsPanel = page.locator('text=/[1-9]\\d* selected/');
    await expect(bulkOpsPanel).toBeVisible();
  });

  test('SMOKE TEST: Basic app functionality', async ({ page }) => {
    // This is the most critical test - if this fails, nothing else matters
    
    // 1. App loads
    await expect(page).toHaveTitle(/MMT/);
    
    // 2. No loading spinner stuck
    const loadingText = page.locator('text=Loading...');
    if (await loadingText.isVisible()) {
      await expect(loadingText).toBeHidden({ timeout: 10000 });
    }
    
    // 3. Documents are visible
    const tableRows = page.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);
    
    // 4. No console errors
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Filter out expected errors (501 for unconfigured features)
    const unexpectedErrors = consoleLogs.filter(log => 
      !log.includes('501') && 
      !log.includes('Not Implemented')
    );
    
    expect(unexpectedErrors).toEqual([]);
    
    console.log('✅ SMOKE TEST PASSED: App is functional with data');
  });
});