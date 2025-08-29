import { test, expect } from '@playwright/test';

test.describe('Test Harness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-harness');
  });

  test('should display all test harness sections', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('MMT Test Harness');
    
    // Check all sections are present
    await expect(page.locator('text=Vault Operations')).toBeVisible();
    await expect(page.locator('text=Document Operations')).toBeVisible();
    await expect(page.locator('text=File Operations')).toBeVisible();
    await expect(page.locator('text=Search Operations')).toBeVisible();
    await expect(page.locator('text=Debug Output')).toBeVisible();
  });

  test('should load vaults successfully', async ({ page }) => {
    // Click load vaults button
    await page.getByTestId('load-vaults').click();
    
    // Wait for vaults to load
    await page.waitForFunction(() => {
      const vaultCount = document.querySelector('[data-testid="vault-count"]');
      return vaultCount && !vaultCount.textContent?.includes('0');
    }, { timeout: 10000 });
    
    // Check that vaults are displayed
    const vaultCount = await page.getByTestId('vault-count').textContent();
    expect(vaultCount).toContain('Loaded Vaults:');
    expect(vaultCount).not.toContain('Loaded Vaults: 0');
    
    // Check that at least one vault is shown
    const vaults = await page.locator('[data-testid^="vault-"]').count();
    expect(vaults).toBeGreaterThan(0);
  });

  test('should check vault status', async ({ page }) => {
    // First load vaults
    await page.getByTestId('load-vaults').click();
    await page.waitForSelector('[data-testid^="check-status-"]', { timeout: 10000 });
    
    // Click the first vault's check status button
    const firstStatusButton = page.locator('[data-testid^="check-status-"]').first();
    await firstStatusButton.click();
    
    // Wait for API call to be logged
    await page.waitForFunction(() => {
      const apiCalls = document.querySelector('[data-testid="api-calls"]');
      return apiCalls && apiCalls.textContent?.includes('/api/vaults/');
    }, { timeout: 5000 });
    
    // Check that API call was logged
    const apiCalls = await page.getByTestId('api-calls').textContent();
    expect(apiCalls).toContain('/api/vaults/');
    expect(apiCalls).toContain('Status:');
  });

  test('should fetch documents for a vault', async ({ page }) => {
    // Load vaults first
    await page.getByTestId('load-vaults').click();
    await page.waitForSelector('[data-testid^="fetch-docs-"]', { timeout: 10000 });
    
    // Click fetch documents for first vault
    const firstFetchButton = page.locator('[data-testid^="fetch-docs-"]').first();
    await firstFetchButton.click();
    
    // Wait for active tab to be created
    await page.waitForSelector('[data-testid="active-tab"]', { timeout: 10000 });
    
    // Check that an active tab exists
    const activeTab = await page.getByTestId('active-tab').textContent();
    expect(activeTab).toContain('Active Tab:');
    expect(activeTab).toContain('Vault:');
    
    // Check document count is displayed
    const docCount = await page.getByTestId('document-count').textContent();
    expect(docCount).toContain('Documents:');
  });

  test('should handle file operations', async ({ page }) => {
    // Test reveal in finder
    await page.getByTestId('reveal-in-finder').click();
    
    // Wait for API call to be logged
    await page.waitForFunction(() => {
      const apiCalls = document.querySelector('[data-testid="api-calls"]');
      return apiCalls && apiCalls.textContent?.includes('/api/files/reveal');
    }, { timeout: 5000 });
    
    // Test quicklook
    await page.getByTestId('quicklook-preview').click();
    
    // Wait for API call to be logged
    await page.waitForFunction(() => {
      const apiCalls = document.querySelector('[data-testid="api-calls"]');
      return apiCalls && apiCalls.textContent?.includes('/api/files/quicklook');
    }, { timeout: 5000 });
    
    // Verify both operations were logged
    const apiCalls = await page.getByTestId('api-calls').textContent();
    expect(apiCalls).toContain('/api/files/reveal');
    expect(apiCalls).toContain('/api/files/quicklook');
  });

  test('should perform text search', async ({ page }) => {
    // Load vaults and create a tab first
    await page.getByTestId('load-vaults').click();
    await page.waitForSelector('[data-testid^="fetch-docs-"]', { timeout: 10000 });
    
    const firstFetchButton = page.locator('[data-testid^="fetch-docs-"]').first();
    await firstFetchButton.click();
    
    // Wait for active tab
    await page.waitForSelector('[data-testid="active-tab"]', { timeout: 10000 });
    
    // Enter search query
    await page.getByTestId('text-search-input').fill('test query');
    
    // Click search button
    await page.getByTestId('text-search-button').click();
    
    // Wait for search mode to be updated
    await page.waitForFunction(() => {
      const searchMode = document.querySelector('[data-testid="search-mode"]');
      return searchMode && searchMode.textContent?.includes('text');
    }, { timeout: 5000 });
    
    // Verify search was initiated
    const searchMode = await page.getByTestId('search-mode').textContent();
    expect(searchMode).toContain('Search Mode: text');
  });

  test('should track API calls in debug output', async ({ page }) => {
    // Perform some operations
    await page.getByTestId('load-vaults').click();
    
    // Wait for API calls to be logged
    await page.waitForFunction(() => {
      const apiCalls = document.querySelector('[data-testid="api-calls"]');
      return apiCalls && !apiCalls.textContent?.includes('No API calls yet');
    }, { timeout: 10000 });
    
    // Check API calls section
    const apiCallsSection = await page.getByTestId('api-calls').textContent();
    expect(apiCallsSection).toContain('API Calls');
    expect(apiCallsSection).not.toContain('No API calls yet');
    
    // Check error log section exists
    const errorLog = await page.getByTestId('error-log').textContent();
    expect(errorLog).toContain('Errors');
    
    // Check store state section
    const storeState = await page.getByTestId('store-state').textContent();
    expect(storeState).toContain('Store State');
    expect(storeState).toContain('Vaults:');
    expect(storeState).toContain('Tabs:');
  });

  test('should handle similarity search', async ({ page }) => {
    // Load vaults and create a tab first
    await page.getByTestId('load-vaults').click();
    await page.waitForSelector('[data-testid^="fetch-docs-"]', { timeout: 10000 });
    
    const firstFetchButton = page.locator('[data-testid^="fetch-docs-"]').first();
    await firstFetchButton.click();
    
    // Wait for active tab
    await page.waitForSelector('[data-testid="active-tab"]', { timeout: 10000 });
    
    // Check similarity status first
    const firstSimilarityButton = page.locator('[data-testid^="check-similarity-"]').first();
    await firstSimilarityButton.click();
    
    // Enter similarity search query
    await page.getByTestId('similarity-search-input').fill('test similarity query');
    
    // Click similarity search button
    await page.getByTestId('similarity-search-button').click();
    
    // Wait for API call to be logged (may get 501 if not configured)
    await page.waitForFunction(() => {
      const apiCalls = document.querySelector('[data-testid="api-calls"]');
      return apiCalls && apiCalls.textContent?.includes('/similarity/');
    }, { timeout: 5000 });
    
    // Verify similarity search was attempted
    const apiCalls = await page.getByTestId('api-calls').textContent();
    expect(apiCalls).toContain('/similarity/');
  });

  test('should clear debug outputs', async ({ page }) => {
    // Generate some API calls
    await page.getByTestId('load-vaults').click();
    
    // Wait for API calls to be logged
    await page.waitForFunction(() => {
      const apiCalls = document.querySelector('[data-testid="api-calls"]');
      return apiCalls && !apiCalls.textContent?.includes('No API calls yet');
    }, { timeout: 10000 });
    
    // Clear API calls
    await page.locator('text=Clear API Calls').click();
    
    // Verify API calls were cleared
    const apiCallsAfterClear = await page.getByTestId('api-calls').textContent();
    expect(apiCallsAfterClear).toContain('API Calls (0)');
    expect(apiCallsAfterClear).toContain('No API calls yet');
  });
});