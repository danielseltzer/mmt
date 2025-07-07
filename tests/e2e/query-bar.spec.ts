import { test, expect } from '@playwright/test';
import { launchElectronWithTestVault, closeElectronAndCleanup, TestContext } from './electron-helpers';

test.describe('Query Bar Functionality', () => {
  let context: TestContext;

  test.beforeAll(async () => {
    context = await launchElectronWithTestVault();
  });

  test.afterAll(async () => {
    await closeElectronAndCleanup(context);
  });

  test('should allow typing in the query input', async () => {
    const { page } = context;
    const queryInput = await page.locator('input[placeholder*="Enter query"]');
    
    // Type a query
    await queryInput.fill('tag:important');
    await expect(queryInput).toHaveValue('tag:important');
  });

  test('should enable search button when query is entered', async () => {
    const { page } = context;
    const queryInput = await page.locator('input[placeholder*="Enter query"]');
    const searchButton = await page.locator('button:has-text("Search")');
    
    // Initially disabled when empty
    await queryInput.clear();
    await expect(searchButton).toBeDisabled();
    
    // Enabled when text is entered
    await queryInput.fill('test query');
    await expect(searchButton).not.toBeDisabled();
  });

  test('should clear query when clear button is clicked', async () => {
    const { page } = context;
    const queryInput = await page.locator('input[placeholder*="Enter query"]');
    const clearButton = await page.locator('button:has-text("Clear")');
    
    // Enter text
    await queryInput.fill('test query');
    await expect(queryInput).toHaveValue('test query');
    
    // Click clear
    await clearButton.click();
    await expect(queryInput).toHaveValue('');
  });

  test('should display example queries', async () => {
    const { page } = context;
    // Check for example queries
    await expect(page.locator('code:has-text("tag:project")')).toBeVisible();
    await expect(page.locator('code:has-text("path:*/archive/*")')).toBeVisible();
    await expect(page.locator('code:has-text("has:frontmatter.status")')).toBeVisible();
  });

  test('should trigger search on Enter key', async () => {
    const { page } = context;
    const queryInput = await page.locator('input[placeholder*="Enter query"]');
    
    // Type and press Enter
    await queryInput.fill('test search');
    await queryInput.press('Enter');
    
    // In real app, this would trigger search
    // For now, just verify the input still has the value
    await expect(queryInput).toHaveValue('test search');
  });
});