import { test, expect } from '@playwright/test';

test.describe('Vault Display Tests', () => {

  test('should display all configured vaults', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for the page to fully load
    await page.waitForTimeout(3000);
    
    // Verify the default tab is created (usually the first vault)
    console.log('Checking for default vault tab...');
    const personalTab = page.locator('[data-testid="tab-trigger-Personal"]');
    await expect(personalTab).toBeVisible({ timeout: 10000 });
    console.log('✓ Personal tab is visible (default)');
    
    // Verify all vaults are available in the dropdown menu
    console.log('\nChecking dropdown menu for all vaults...');
    const dropdownButton = page.locator('[title="Open new vault tab"]');
    await expect(dropdownButton).toBeVisible();
    
    // Open the dropdown
    await dropdownButton.click();
    await page.waitForTimeout(500); // Wait for dropdown animation
    
    // Check for all vaults in the dropdown
    const personalMenuItem = page.locator('[role="menuitem"]:has-text("Personal")');
    const indBizDevMenuItem = page.locator('[role="menuitem"]:has-text("InD BizDev")');
    const workMenuItem = page.locator('[role="menuitem"]:has-text("Work")');
    
    await expect(personalMenuItem).toBeVisible();
    console.log('✓ Personal vault available in dropdown');
    
    await expect(indBizDevMenuItem).toBeVisible();
    console.log('✓ InD BizDev vault available in dropdown');
    
    await expect(workMenuItem).toBeVisible();
    console.log('✓ Work vault available in dropdown');
    
    // Close the dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Now open tabs for the other vaults to verify they work
    console.log('\nOpening tabs for other vaults...');
    
    // Open InD BizDev tab
    await dropdownButton.click();
    await indBizDevMenuItem.click();
    await page.waitForTimeout(1000);
    
    const indBizDevTab = page.locator('[data-testid="tab-trigger-InD BizDev"]');
    await expect(indBizDevTab).toBeVisible();
    console.log('✓ InD BizDev tab created successfully');
    
    // Open Work tab
    await dropdownButton.click();
    await workMenuItem.click();
    await page.waitForTimeout(1000);
    
    const workTab = page.locator('[data-testid="tab-trigger-Work"]');
    await expect(workTab).toBeVisible();
    console.log('✓ Work tab created successfully');
    
    // Verify all tabs are now present
    const allTabs = await page.locator('[data-testid^="tab-trigger-"]').all();
    console.log(`\n✓ All ${allTabs.length} vault tabs created successfully`);
    expect(allTabs).toHaveLength(3);
  });

  test('should load documents for each vault', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for initial load
    await page.waitForTimeout(3000);
    
    // Check Personal vault (default)
    const personalDocCount = await page.locator('[data-testid="tab-trigger-Personal"]').textContent();
    expect(personalDocCount).toContain('5,992'); // Personal vault has 5,992 documents
    console.log('✓ Personal vault shows correct document count');
    
    // Open and check InD BizDev vault
    const dropdownButton = page.locator('[title="Open new vault tab"]');
    await dropdownButton.click();
    const indBizDevMenuItem = page.locator('[role="menuitem"]:has-text("InD BizDev")');
    await indBizDevMenuItem.click();
    await page.waitForTimeout(2000); // Wait for documents to load
    
    const indBizDevTab = page.locator('[data-testid="tab-trigger-InD BizDev"]');
    await indBizDevTab.click(); // Switch to the tab
    await page.waitForTimeout(1000);
    
    const indBizDevDocCount = await indBizDevTab.textContent();
    expect(indBizDevDocCount).toMatch(/\d+/); // Should contain a number
    console.log(`✓ InD BizDev vault loaded with documents: ${indBizDevDocCount}`);
    
    // Open and check Work vault
    await dropdownButton.click();
    const workMenuItem = page.locator('[role="menuitem"]:has-text("Work")');
    await workMenuItem.click();
    await page.waitForTimeout(2000); // Wait for documents to load
    
    const workTab = page.locator('[data-testid="tab-trigger-Work"]');
    await workTab.click(); // Switch to the tab
    await page.waitForTimeout(1000);
    
    const workDocCount = await workTab.textContent();
    expect(workDocCount).toMatch(/\d+/); // Should contain a number
    console.log(`✓ Work vault loaded with documents: ${workDocCount}`);
  });
});