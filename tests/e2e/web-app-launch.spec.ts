import { test, expect } from '@playwright/test';

test.describe('Web App Launch', () => {
  test('should display the main page', async ({ page }) => {
    await page.goto('/');
    
    // Check window title
    await expect(page).toHaveTitle('MMT - Markdown Management Toolkit');
    
    // Check header is visible
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Check app title
    const appTitle = page.locator('h1');
    await expect(appTitle).toHaveText('MMT - Markdown Management Toolkit');
  });

  test('should display the query bar', async ({ page }) => {
    await page.goto('/');
    
    // Check query input
    const queryInput = page.locator('input[placeholder*="Enter query"]');
    await expect(queryInput).toBeVisible();
    
    // Check search button
    const searchButton = page.locator('button:has-text("Search")');
    await expect(searchButton).toBeVisible();
    
    // Check clear button
    const clearButton = page.locator('button:has-text("Clear")');
    await expect(clearButton).toBeVisible();
  });

  test('should connect to API server', async ({ page }) => {
    await page.goto('/');
    
    // Check connection status - should show connected
    const connectionStatus = page.locator('text=Connected');
    await expect(connectionStatus).toBeVisible({ timeout: 10000 });
  });

  test('should load documents on startup', async ({ page }) => {
    await page.goto('/');
    
    // Wait for documents to load
    await page.waitForTimeout(2000);
    
    // Check if status bar updates (might show 0 documents if test vault is empty)
    const statusBar = page.locator('div:has-text("document")');
    await expect(statusBar).toBeVisible();
  });

  test('API health check should work', async ({ request }) => {
    const response = await request.get('http://localhost:3001/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('vaultPath');
  });

  test('API documents endpoint should work', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/documents');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('documents');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.documents)).toBeTruthy();
  });
});