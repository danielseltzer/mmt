import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false }); // Run with UI to see what's happening
const page = await browser.newPage();

console.log('=== Navigating to http://localhost:5173 ===');
await page.goto('http://localhost:5173');

// Wait for the page to fully load
await page.waitForTimeout(3000);

// Check if the tab bar is visible
const tabBar = await page.locator('[data-testid="tab-bar"]');
const isTabBarVisible = await tabBar.isVisible();
console.log(`Tab bar visible: ${isTabBarVisible}`);

if (isTabBarVisible) {
  // Check for existing tabs
  const tabs = await page.locator('[data-testid^="tab-trigger-"]').all();
  console.log(`\nFound ${tabs.length} tab(s):`);
  for (const tab of tabs) {
    const testId = await tab.getAttribute('data-testid');
    const text = await tab.textContent();
    console.log(`  - ${testId}: "${text}"`);
  }
  
  // Click the dropdown button
  const dropdownButton = page.locator('[title="Open new vault tab"]');
  const isDropdownVisible = await dropdownButton.isVisible();
  console.log(`\nDropdown button visible: ${isDropdownVisible}`);
  
  if (isDropdownVisible) {
    console.log('Clicking dropdown button...');
    await dropdownButton.click();
    await page.waitForTimeout(1000);
    
    // Check dropdown items
    const dropdownItems = await page.locator('[role="menuitem"]').all();
    console.log(`\nFound ${dropdownItems.length} dropdown items:`);
    for (const item of dropdownItems) {
      const text = await item.textContent();
      const isDisabled = await item.getAttribute('aria-disabled');
      console.log(`  - "${text}" (disabled: ${isDisabled || 'false'})`);
    }
  }
} else {
  console.log('Tab bar is not visible - checking why...');
  
  // Check vaults from the store
  const storeData = await page.evaluate(() => {
    // Try to access Zustand store if exposed
    const stores = window.getAllStores?.() || [];
    for (const store of stores) {
      const state = store.getState();
      if (state.vaults) {
        return {
          vaults: state.vaults,
          tabs: state.tabs,
          isLoadingVaults: state.isLoadingVaults
        };
      }
    }
    return null;
  });
  
  if (storeData) {
    console.log('\nStore data:');
    console.log(`  Vaults: ${JSON.stringify(storeData.vaults)}`);
    console.log(`  Tabs: ${JSON.stringify(storeData.tabs)}`);
    console.log(`  Loading: ${storeData.isLoadingVaults}`);
  }
}

console.log('\nKeeping browser open for 10 seconds to observe...');
await page.waitForTimeout(10000);

await browser.close();
console.log('Test complete.');