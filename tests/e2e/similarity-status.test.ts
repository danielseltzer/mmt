import { test, expect } from '@playwright/test';

test.describe('Similarity Status Endpoint', () => {
  test('should return status for similarity endpoint', async ({ request }) => {
    // Test the API directly
    const response = await request.get('http://localhost:3001/api/vaults/Personal/similarity/status');
    
    // Should not be 404
    expect(response.status()).not.toBe(404);
    
    // If configured, should return 200 with status
    // If not configured, should return 501
    expect([200, 501]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('isIndexing');
      expect(data).toHaveProperty('totalDocuments');
      expect(data).toHaveProperty('indexedDocuments');
    }
  });

  test('should not show 404 errors in browser console', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for app to mount
    await page.waitForSelector('[data-testid="app-mounted"]', { 
      state: 'attached',
      timeout: 5000 
    }).catch(() => {
      // If no test id, wait for any indication the app loaded
      return page.waitForSelector('.document-table, .filter-bar, h1', { 
        state: 'attached',
        timeout: 5000 
      });
    });

    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Also check for failed network requests
    const failed404s: string[] = [];
    page.on('response', response => {
      if (response.status() === 404 && response.url().includes('/similarity/status')) {
        failed404s.push(response.url());
      }
    });

    // Wait a bit for any async calls to complete
    await page.waitForTimeout(2000);

    // Check for 404s on similarity/status endpoint
    expect(failed404s).toHaveLength(0);
    
    // Check for console errors about similarity
    const similarityErrors = errors.filter(e => e.includes('similarity') || e.includes('404'));
    expect(similarityErrors).toHaveLength(0);
  });

  test('should show all configured vaults in UI', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for vaults to load
    await page.waitForTimeout(2000);
    
    // Check if vault selector exists and has all vaults
    const vaultSelector = await page.locator('[data-testid="vault-selector"], select, .vault-selector').first();
    
    if (await vaultSelector.count() > 0) {
      // If there's a vault selector, check it has all vaults
      const options = await vaultSelector.locator('option').allTextContents();
      expect(options).toContain('Personal');
      expect(options).toContain('InD BizDev');
      expect(options).toContain('Work');
    } else {
      // Check for vault tabs or indicators
      const personalVault = await page.locator('text="Personal"').count();
      const indVault = await page.locator('text="InD BizDev"').count();
      const workVault = await page.locator('text="Work"').count();
      
      expect(personalVault).toBeGreaterThan(0);
      expect(indVault).toBeGreaterThan(0);
      expect(workVault).toBeGreaterThan(0);
    }
  });
});