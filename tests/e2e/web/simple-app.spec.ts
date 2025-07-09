import { test, expect } from '@playwright/test';

// These tests assume servers are already running
// Run with: node scripts/test-web-e2e.js

test.describe('MMT Web App', () => {
  test('should load the app without errors', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Check that the app loaded
    await expect(page.locator('h1')).toContainText('MMT - Markdown Management Toolkit');
    
    // Check for no console errors
    let hasErrors = false;
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
        hasErrors = true;
      }
    });
    
    await page.waitForTimeout(1000);
    expect(hasErrors).toBe(false);
  });
  
  test('should display documents from vault', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for any loading to complete
    await page.waitForTimeout(2000);
    
    // Check that we have the table (TableView should render)
    const tableExists = await page.locator('table').count() > 0;
    expect(tableExists).toBe(true);
    
    // Check for document names in the table
    await expect(page.getByText('welcome')).toBeVisible();
    await expect(page.getByText('todo')).toBeVisible();
    await expect(page.getByText('project')).toBeVisible();
  });
  
  test('should filter documents with search', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Type in search box
    await page.fill('.query-input', 'todo');
    
    // Wait for filter to apply
    await page.waitForTimeout(1000);
    
    // Check filtered results - todo should be visible, others not
    await expect(page.getByText('todo')).toBeVisible();
    
    // These should not be visible in the filtered results
    const welcomeVisible = await page.getByText('welcome').isVisible().catch(() => false);
    const projectVisible = await page.getByText('project').isVisible().catch(() => false);
    
    expect(welcomeVisible).toBe(false);
    expect(projectVisible).toBe(false);
  });
});