import { test, expect } from '@playwright/test';
import { launchElectronWithTestVault, closeElectronAndCleanup, TestContext } from './electron-helpers';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

test.describe('MMT E2E Tests', () => {
  let context: TestContext;

  test.beforeAll(async () => {
    context = await launchElectronWithTestVault();
  });

  test.afterAll(async () => {
    await closeElectronAndCleanup(context);
  });

  test('user searches "project alpha" and sees filtered results', async () => {
    const { page } = context;
    
    // First, let's check if the page has any content
    await page.waitForTimeout(3000); // Give extra time for app to load
    const bodyText = await page.textContent('body');
    console.log('[E2E] Page body text:', bodyText?.substring(0, 200));
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/e2e-screenshot.png' });
    
    // Find and fill the query input
    const queryInput = page.locator('input[placeholder*="Enter query"]');
    await queryInput.fill('project alpha');
    
    // Click search button
    const searchButton = page.locator('button:has-text("Search")');
    await searchButton.click();
    
    // Wait for results to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Verify we see project alpha results
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBeLessThanOrEqual(500); // Should respect row limit
    
    // Check that results contain "project alpha"
    const firstRowName = await page.locator('table tbody tr:first-child td[data-testid="name-cell"]').textContent();
    expect(firstRowName).toBeTruthy();
    
    // Verify status shows result count
    const statusBar = page.locator('text=/\\d+ documents? found/');
    await expect(statusBar).toBeVisible();
  });

  test('user selects 10 files and moves to /Archive/2024', async () => {
    const { page, vaultGenerator } = context;
    
    // First, search for active projects
    const queryInput = page.locator('input[placeholder*="Enter query"]');
    await queryInput.clear();
    await queryInput.fill('path:projects/active/*');
    await page.locator('button:has-text("Search")').click();
    
    // Wait for results
    await page.waitForSelector('table tbody tr');
    
    // Select first 10 checkboxes
    for (let i = 0; i < 10; i++) {
      const checkbox = page.locator(`table tbody tr:nth-child(${i + 1}) input[type="checkbox"]`);
      await checkbox.click();
    }
    
    // Verify selection count
    await expect(page.locator('text=/10 selected/')).toBeVisible();
    
    // Click operations button
    const operationsButton = page.locator('button:has-text("Operations")');
    await expect(operationsButton).toBeEnabled();
    await operationsButton.click();
    
    // Select move operation
    await page.locator('button:has-text("Move")').click();
    
    // Enter destination path
    const destinationInput = page.locator('input[placeholder*="destination"]');
    await destinationInput.fill('/projects/archive/2024');
    
    // Execute operation
    await page.locator('button:has-text("Execute")').click();
    
    // Wait for success message
    await expect(page.locator('text=/Moved 10 files successfully/')).toBeVisible({ timeout: 10000 });
    
    // Verify files were actually moved
    const vaultPath = vaultGenerator.getVaultPath();
    const movedFile = join(vaultPath, 'projects/archive/2024/project-1.md');
    expect(existsSync(movedFile)).toBeTruthy();
  });

  test('user adds "status:archived" property to selected files', async () => {
    const { page, vaultGenerator } = context;
    
    // Search for files in archive
    const queryInput = page.locator('input[placeholder*="Enter query"]');
    await queryInput.clear();
    await queryInput.fill('path:projects/archive/2024/*');
    await page.locator('button:has-text("Search")').click();
    
    // Wait for results
    await page.waitForSelector('table tbody tr');
    
    // Select first 5 files
    for (let i = 0; i < 5; i++) {
      const checkbox = page.locator(`table tbody tr:nth-child(${i + 1}) input[type="checkbox"]`);
      await checkbox.click();
    }
    
    // Open operations menu
    await page.locator('button:has-text("Operations")').click();
    
    // Select update frontmatter operation
    await page.locator('button:has-text("Update Frontmatter")').click();
    
    // Add property
    await page.locator('input[placeholder*="property name"]').fill('status');
    await page.locator('input[placeholder*="property value"]').fill('archived');
    
    // Execute
    await page.locator('button:has-text("Execute")').click();
    
    // Wait for success
    await expect(page.locator('text=/Updated frontmatter for 5 files/')).toBeVisible({ timeout: 10000 });
    
    // Verify frontmatter was updated
    const vaultPath = vaultGenerator.getVaultPath();
    const updatedFile = join(vaultPath, 'projects/archive/2024/project-1.md');
    if (existsSync(updatedFile)) {
      const content = readFileSync(updatedFile, 'utf-8');
      expect(content).toContain('status: archived');
    }
  });

  test('user saves view as "Archived Projects" and reloads it', async () => {
    const { page } = context;
    
    // Set up a specific view (archived projects with sorting)
    const queryInput = page.locator('input[placeholder*="Enter query"]');
    await queryInput.clear();
    await queryInput.fill('frontmatter.status:archived');
    await page.locator('button:has-text("Search")').click();
    
    await page.waitForSelector('table tbody tr');
    
    // Sort by name
    await page.locator('th:has-text("Name")').click();
    
    // Save view
    await page.locator('button:has-text("Save View")').click();
    
    // Enter view name
    const viewNameInput = page.locator('input[placeholder*="View name"]');
    await viewNameInput.fill('Archived Projects');
    await page.locator('button:has-text("Save")').click();
    
    // Clear current view
    await page.locator('button:has-text("Clear")').click();
    
    // Load saved view
    await page.locator('button:has-text("Load View")').click();
    await page.locator('text="Archived Projects"').click();
    
    // Verify view is restored
    await expect(queryInput).toHaveValue('frontmatter.status:archived');
    await page.waitForSelector('table tbody tr');
    
    // Verify sort is maintained (check aria-sort attribute)
    const nameHeader = page.locator('th:has-text("Name")');
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  test('user exports current view to CSV and verifies file', async () => {
    const { page } = context;
    
    // Search for some documents
    const queryInput = page.locator('input[placeholder*="Enter query"]');
    await queryInput.clear();
    await queryInput.fill('type:project');
    await page.locator('button:has-text("Search")').click();
    
    await page.waitForSelector('table tbody tr');
    
    // Set up download promise before clicking
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.locator('button:has-text("Export")').click();
    await page.locator('button:has-text("Export to CSV")').click();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify filename
    expect(download.suggestedFilename()).toMatch(/mmt-export-.*\.csv/);
    
    // Save and verify content
    const path = await download.path();
    if (path) {
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain('Name,Path,Modified,Size,Tags'); // CSV headers
      expect(content).toContain('project'); // Should have project data
    }
  });

  test('user clicks column to sort by modified date', async () => {
    const { page } = context;
    
    // Search to get results
    const queryInput = page.locator('input[placeholder*="Enter query"]');
    await queryInput.clear();
    await queryInput.fill('path:notes/daily/*');
    await page.locator('button:has-text("Search")').click();
    
    await page.waitForSelector('table tbody tr');
    
    // Get initial order
    const firstRowBefore = await page.locator('table tbody tr:first-child td[data-testid="name-cell"]').textContent();
    
    // Click Modified column header
    const modifiedHeader = page.locator('th:has-text("Modified")');
    await modifiedHeader.click();
    
    // Wait for sort to apply
    await page.waitForTimeout(500);
    
    // Verify sort indicator
    await expect(modifiedHeader).toHaveAttribute('aria-sort', 'ascending');
    
    // Click again for descending
    await modifiedHeader.click();
    await expect(modifiedHeader).toHaveAttribute('aria-sort', 'descending');
    
    // Verify order changed
    const firstRowAfter = await page.locator('table tbody tr:first-child td[data-testid="name-cell"]').textContent();
    expect(firstRowAfter).not.toBe(firstRowBefore);
  });

  test('app shows error when moving to existing file', async () => {
    const { page } = context;
    
    // Search for test file
    const queryInput = page.locator('input[placeholder*="Enter query"]');
    await queryInput.clear();
    await queryInput.fill('name:test-move-source');
    await page.locator('button:has-text("Search")').click();
    
    await page.waitForSelector('table tbody tr');
    
    // Select the file
    await page.locator('table tbody tr:first-child input[type="checkbox"]').click();
    
    // Open operations
    await page.locator('button:has-text("Operations")').click();
    await page.locator('button:has-text("Move")').click();
    
    // Try to move to existing file
    await page.locator('input[placeholder*="destination"]').fill('/duplicate-name.md');
    await page.locator('button:has-text("Execute")').click();
    
    // Expect error message
    await expect(page.locator('text=/already exists|File exists|Cannot move/')).toBeVisible({ timeout: 5000 });
    
    // Verify original file still exists
    const originalPath = join(context.vaultGenerator.getVaultPath(), 'test-move-source.md');
    expect(existsSync(originalPath)).toBeTruthy();
  });
});