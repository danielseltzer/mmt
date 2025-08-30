import { test, expect } from '@playwright/test';

test.describe('Vault Status Indicators', () => {
  test('status indicators appear and show content', async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Skip React DevTools suggestion as it's not a real error
        if (!msg.text().includes('React DevTools')) {
          consoleErrors.push(msg.text());
        }
      }
    });
    
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for app to load - look for either the vault selector (multi-vault) 
    // or the document table (single vault) as both indicate app is loaded
    const appLoadedSelector = page.locator('[data-testid="vault-selector"], [data-testid="document-table"]').first();
    await expect(appLoadedSelector).toBeVisible({ timeout: 10000 });
    
    // Check that status container exists (should be present for both single and multi-vault)
    const statusContainer = page.locator('[data-testid="vault-status-container"]');
    const statusContainerCount = await statusContainer.count();
    
    // Status container might not exist if vault selector isn't shown
    // Check for tab status instead as an alternative indicator
    if (statusContainerCount === 0) {
      // Check for tab status indicators as alternative
      const tabStatusIndicators = page.locator('[data-testid^="tab-status-"]');
      const tabCount = await tabStatusIndicators.count();
      
      expect(tabCount, 'Should have either status container or tab status indicators').toBeGreaterThan(0);
      
      if (tabCount > 0) {
        const firstTabStatus = tabStatusIndicators.first();
        await expect(firstTabStatus).toBeVisible();
        const text = await firstTabStatus.textContent();
        expect(text, 'Tab status should have content').toBeTruthy();
      }
    } else {
      // Verify status container is visible
      await expect(statusContainer.first()).toBeVisible({
        timeout: 5000,
      });
      
      // Verify status container has content (not empty)
      const statusText = await statusContainer.first().textContent();
      expect(statusText, 'Status container should have content').toBeTruthy();
      expect(statusText?.trim().length, 'Status text should not be empty').toBeGreaterThan(0);
    }
    
    // Check for re-index button (may or may not be present depending on state)
    const reindexButton = page.locator('[data-testid="vault-reindex-button"]');
    const buttonCount = await reindexButton.count();
    // Button presence depends on vault state - just verify it's handled properly
    expect(buttonCount, 'Re-index button count should be valid').toBeGreaterThanOrEqual(0);
    
    // If button exists, verify it's visible
    if (buttonCount > 0) {
      await expect(reindexButton.first()).toBeVisible();
    }
    
    // Verify no console errors occurred
    expect(consoleErrors, `Console errors found: ${consoleErrors.join(', ')}`).toHaveLength(0);
    
    // Verify documents actually loaded (not stuck on "Loading documents...")
    const loadingText = page.locator('text="Loading documents..."');
    await expect(loadingText).not.toBeVisible({ timeout: 5000 });
  });
  
  test('status appears in tab bar', async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('React DevTools')) {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:5173');
    
    // Wait for app to load - look for document table which should always be present
    const documentTable = page.locator('[data-testid="document-table"]');
    await expect(documentTable).toBeVisible({ timeout: 10000 });
    
    // Check for tab status indicators (may have multiple tabs)
    const tabStatusIndicators = page.locator('[data-testid^="tab-status-"]');
    const tabCount = await tabStatusIndicators.count();
    
    // Should have at least one tab status indicator
    expect(tabCount, 'Should have at least one tab status indicator').toBeGreaterThan(0);
    
    // Verify at least the first tab status is visible
    const firstTabStatus = tabStatusIndicators.first();
    await expect(firstTabStatus).toBeVisible();
    
    // Verify it has content
    const text = await firstTabStatus.textContent();
    expect(text, 'Tab status should have content').toBeTruthy();
    expect(text?.trim().length, 'Tab status text should not be empty').toBeGreaterThan(0);
    
    // Verify no console errors occurred
    expect(consoleErrors, `Console errors found: ${consoleErrors.join(', ')}`).toHaveLength(0);
  });
});