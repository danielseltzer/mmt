import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

test.describe('Document Search', () => {
  test.beforeAll(async () => {
    // Create test documents in the test vault
    const vaultPath = '/tmp/mmt-e2e-vault';
    
    // Create some test markdown files
    writeFileSync(join(vaultPath, 'test1.md'), '# Test Document 1\n\nThis is a test document about testing.');
    writeFileSync(join(vaultPath, 'test2.md'), '# Test Document 2\n\nThis document contains information about E2E tests.');
    writeFileSync(join(vaultPath, 'README.md'), '# README\n\nThis is the project readme file.');
    
    // Wait for indexing
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  test('should search for documents', async ({ page }) => {
    await page.goto('/');
    
    // Wait for initial load
    await page.waitForTimeout(1000);
    
    // Enter search query
    const queryInput = page.locator('input[placeholder*="Enter query"]');
    await queryInput.fill('test');
    
    // Click search
    const searchButton = page.locator('button:has-text("Search")');
    await searchButton.click();
    
    // Wait for results
    await page.waitForTimeout(1000);
    
    // Check that results appear
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    
    // Check status bar updates
    const statusBar = page.locator('div:has-text("document")');
    const statusText = await statusBar.textContent();
    expect(statusText).toContain('document');
  });

  test('should clear search results', async ({ page }) => {
    await page.goto('/');
    
    // Enter search query
    const queryInput = page.locator('input[placeholder*="Enter query"]');
    await queryInput.fill('test');
    
    // Click search
    const searchButton = page.locator('button:has-text("Search")');
    await searchButton.click();
    
    // Wait for results
    await page.waitForTimeout(1000);
    
    // Click clear
    const clearButton = page.locator('button:has-text("Clear")');
    await clearButton.click();
    
    // Check query input is cleared
    await expect(queryInput).toHaveValue('');
    
    // Check empty state appears
    const emptyState = page.locator('text=No documents found');
    await expect(emptyState).toBeVisible();
  });

  test('should show document details in table', async ({ page }) => {
    await page.goto('/');
    
    // Search for all documents
    const queryInput = page.locator('input[placeholder*="Enter query"]');
    await queryInput.fill('*');
    
    const searchButton = page.locator('button:has-text("Search")');
    await searchButton.click();
    
    // Wait for results
    await page.waitForTimeout(1000);
    
    // Check table headers
    await expect(page.locator('th:has-text("Path")')).toBeVisible();
    await expect(page.locator('th:has-text("Title")')).toBeVisible();
    await expect(page.locator('th:has-text("Modified")')).toBeVisible();
    await expect(page.locator('th:has-text("Size")')).toBeVisible();
    
    // Check first row has data
    const firstRow = page.locator('tbody tr').first();
    const pathCell = firstRow.locator('td').first();
    const pathText = await pathCell.textContent();
    expect(pathText).toBeTruthy();
    expect(pathText).toContain('.md');
  });

  test('should select documents with checkbox', async ({ page }) => {
    await page.goto('/');
    
    // Search for documents
    const queryInput = page.locator('input[placeholder*="Enter query"]');
    await queryInput.fill('*');
    
    const searchButton = page.locator('button:has-text("Search")');
    await searchButton.click();
    
    // Wait for results
    await page.waitForTimeout(1000);
    
    // Click first checkbox
    const firstCheckbox = page.locator('tbody tr').first().locator('input[type="checkbox"]');
    await firstCheckbox.check();
    
    // Check operations button becomes enabled
    const operationsButton = page.locator('button:has-text("Operations")');
    await expect(operationsButton).toBeEnabled();
    
    // Check status bar shows selection
    const statusBar = page.locator('div:has-text("selected")');
    await expect(statusBar).toBeVisible();
  });
});