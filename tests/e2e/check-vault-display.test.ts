import { test, expect } from '@playwright/test';
import { startTestEnvironment, stopTestEnvironment } from './helpers/test-env';

test.describe('Vault Display Check', () => {
  test.beforeAll(async () => {
    await startTestEnvironment('daniel-vaults');
  });

  test.afterAll(async () => {
    await stopTestEnvironment();
  });

  test('should display all vaults from API', async ({ page }) => {
    // Capture console logs
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for vaults to load
    await page.waitForTimeout(2000);
    
    // Check console logs for loaded vaults
    const vaultLog = logs.find(log => log.includes('Loaded vaults:'));
    console.log('Console logs related to vaults:');
    logs.filter(log => log.toLowerCase().includes('vault')).forEach(log => console.log(log));
    
    // Check API response directly
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch('/api/vaults');
      return await response.json();
    });
    
    console.log('API response:', JSON.stringify(apiResponse, null, 2));
    
    // Check store state
    const storeState = await page.evaluate(() => {
      // Access the Zustand store from window if available
      const store = (window as any).__documentStore;
      if (store) {
        const state = store.getState();
        return {
          vaults: state.vaults,
          tabs: state.tabs,
          activeTabId: state.activeTabId
        };
      }
      return null;
    });
    
    console.log('Store state:', JSON.stringify(storeState, null, 2));
    
    // Check DOM for vault tabs
    const tabElements = await page.locator('[data-testid^="tab-trigger-"]').all();
    console.log(`Found ${tabElements.length} tab(s) in DOM`);
    
    for (const tab of tabElements) {
      const vaultId = await tab.getAttribute('data-testid');
      console.log(`Tab found: ${vaultId}`);
    }
    
    // Check dropdown menu items
    await page.click('[title="Open new vault tab"]');
    await page.waitForTimeout(500);
    
    const dropdownItems = await page.locator('.cursor-pointer').all();
    console.log(`Found ${dropdownItems.length} dropdown items`);
    
    for (const item of dropdownItems) {
      const text = await item.textContent();
      console.log(`Dropdown item: ${text}`);
    }
  });
});