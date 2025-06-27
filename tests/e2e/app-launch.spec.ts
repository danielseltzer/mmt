import { test, expect } from '@playwright/test';
import { launchElectron, closeElectron } from './electron-helpers';

test.describe('Electron App Launch', () => {
  let electronApp: any;
  let page: any;

  test.beforeAll(async () => {
    const result = await launchElectron();
    electronApp = result.app;
    page = result.page;
  });

  test.afterAll(async () => {
    await closeElectron(electronApp);
  });

  test('should launch the application', async () => {
    // Check window title
    const title = await page.title();
    expect(title).toBe('MMT - Markdown Management Toolkit');
  });

  test('should display the main header', async () => {
    // Check header is visible
    const header = await page.locator('header');
    await expect(header).toBeVisible();
    
    // Check app title
    const appTitle = await page.locator('h1');
    await expect(appTitle).toHaveText('Markdown Management Toolkit');
  });

  test('should display the query bar', async () => {
    // Check query input
    const queryInput = await page.locator('input[placeholder*="Enter query"]');
    await expect(queryInput).toBeVisible();
    
    // Check search button
    const searchButton = await page.locator('button:has-text("Search")');
    await expect(searchButton).toBeVisible();
    
    // Check clear button
    const clearButton = await page.locator('button:has-text("Clear")');
    await expect(clearButton).toBeVisible();
  });

  test('should display the document table area', async () => {
    // Check for empty state message
    const emptyState = await page.locator('text=No documents found');
    await expect(emptyState).toBeVisible();
    
    const helpText = await page.locator('text=Enter a query above to search your vault');
    await expect(helpText).toBeVisible();
  });

  test('should display the status bar', async () => {
    // Check status bar exists
    const statusBar = await page.locator('div:has-text("0 document")');
    await expect(statusBar).toBeVisible();
    
    // Check connection status
    const connectionStatus = await page.locator('text=Connected');
    await expect(connectionStatus).toBeVisible();
  });

  test('should have operations button disabled when no documents selected', async () => {
    const operationsButton = await page.locator('button:has-text("Operations")');
    await expect(operationsButton).toBeVisible();
    await expect(operationsButton).toBeDisabled();
  });
});