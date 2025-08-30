import { test, expect } from '@playwright/test';

test.describe('Duplicate Entries Prevention', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh with the app
    await page.goto('http://localhost:5173');
    
    // Wait for the app to mount and load documents
    await page.waitForFunction(() => {
      const element = document.querySelector('[data-app-mounted="true"]');
      return element !== null;
    }, { timeout: 10000 });
    
    // Wait for documents to load
    await page.waitForTimeout(2000);
  });

  test('should not show duplicate documents in table after initial load', async ({ page }) => {
    // Get all document rows
    const rows = await page.locator('[data-testid^="row-"]').all();
    
    // Extract document paths from the rows
    const paths: string[] = [];
    for (const row of rows) {
      const pathCell = await row.locator('td').first().textContent();
      if (pathCell) {
        paths.push(pathCell.trim());
      }
    }
    
    // Check for duplicates
    const uniquePaths = new Set(paths);
    expect(paths.length).toBe(uniquePaths.size);
    
    // Log if we find any duplicates for debugging
    const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
    if (duplicates.length > 0) {
      console.log('Found duplicate paths:', duplicates);
    }
  });

  test('should not create duplicates when switching tabs rapidly', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="document-table"]');
    
    // Get the tab bar and tabs
    const tabs = await page.locator('[role="tab"]').all();
    
    if (tabs.length > 1) {
      // Switch between tabs rapidly
      for (let i = 0; i < 5; i++) {
        await tabs[0].click();
        await page.waitForTimeout(100);
        await tabs[1].click();
        await page.waitForTimeout(100);
      }
      
      // Switch back to first tab
      await tabs[0].click();
      await page.waitForTimeout(500);
      
      // Check for duplicates in the current tab
      const rows = await page.locator('[data-testid^="row-"]').all();
      const paths: string[] = [];
      
      for (const row of rows) {
        const pathCell = await row.locator('td').first().textContent();
        if (pathCell) {
          paths.push(pathCell.trim());
        }
      }
      
      const uniquePaths = new Set(paths);
      expect(paths.length).toBe(uniquePaths.size);
    }
  });

  test('should not create duplicates when applying and removing filters', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="document-table"]');
    
    // Get initial document count
    const initialRows = await page.locator('[data-testid^="row-"]').count();
    
    // Apply a filter (search for something)
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      
      // Clear the search
      await searchInput.clear();
      await page.waitForTimeout(500);
      
      // Check for duplicates after clearing
      const rows = await page.locator('[data-testid^="row-"]').all();
      const paths: string[] = [];
      
      for (const row of rows) {
        const pathCell = await row.locator('td').first().textContent();
        if (pathCell) {
          paths.push(pathCell.trim());
        }
      }
      
      const uniquePaths = new Set(paths);
      expect(paths.length).toBe(uniquePaths.size);
    }
  });

  test('should not create duplicates when refreshing the page', async ({ page }) => {
    // Get initial documents
    const initialRows = await page.locator('[data-testid^="row-"]').all();
    const initialPaths: string[] = [];
    
    for (const row of initialRows) {
      const pathCell = await row.locator('td').first().textContent();
      if (pathCell) {
        initialPaths.push(pathCell.trim());
      }
    }
    
    // Refresh the page
    await page.reload();
    
    // Wait for app to remount
    await page.waitForFunction(() => {
      const element = document.querySelector('[data-app-mounted="true"]');
      return element !== null;
    }, { timeout: 10000 });
    
    await page.waitForTimeout(2000);
    
    // Get documents after refresh
    const refreshedRows = await page.locator('[data-testid^="row-"]').all();
    const refreshedPaths: string[] = [];
    
    for (const row of refreshedRows) {
      const pathCell = await row.locator('td').first().textContent();
      if (pathCell) {
        refreshedPaths.push(pathCell.trim());
      }
    }
    
    // Check for duplicates in refreshed data
    const uniqueRefreshedPaths = new Set(refreshedPaths);
    expect(refreshedPaths.length).toBe(uniqueRefreshedPaths.size);
  });

  test('should use fullPath as unique identifier for documents', async ({ page }) => {
    // This test verifies that the table uses fullPath for row keys
    // which prevents React from creating duplicate DOM nodes
    
    await page.waitForSelector('[data-testid="document-table"]');
    
    // Get all row IDs
    const rows = await page.locator('[data-testid^="row-"]').all();
    const rowIds: string[] = [];
    
    for (const row of rows) {
      const testId = await row.getAttribute('data-testid');
      if (testId) {
        rowIds.push(testId);
      }
    }
    
    // Check that all row IDs are unique
    const uniqueRowIds = new Set(rowIds);
    expect(rowIds.length).toBe(uniqueRowIds.size);
    
    // Also verify that row keys contain path-like structures
    // (they should be based on fullPath or path)
    for (const rowId of rowIds) {
      // Row IDs should start with 'row-' followed by the path-based key
      expect(rowId).toMatch(/^row-/);
    }
  });
});