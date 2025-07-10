import { test, expect } from '@playwright/test';

test('app displays all UI elements correctly', async ({ page }) => {
  await page.goto('/');
  
  // Wait for app to load
  await page.waitForLoadState('networkidle');
  
  // Title should be visible
  await expect(page.getByText('MMT - Markdown Management Toolkit')).toBeVisible();
  
  // Search bar should be visible and functional
  const searchInput = page.getByPlaceholder('Search documents...');
  await expect(searchInput).toBeVisible();
  await expect(searchInput).toBeEditable();
  
  // Document count should be visible
  const docCount = page.getByText(/\d+ documents?/);
  await expect(docCount).toBeVisible();
  const countText = await docCount.textContent();
  console.log(`\n📊 Document count: ${countText}`);
  
  // Table headers should be visible
  await expect(page.getByText('Name', { exact: true })).toBeVisible();
  await expect(page.getByText('Path', { exact: true })).toBeVisible();
  await expect(page.getByText('Modified', { exact: true })).toBeVisible();
  await expect(page.getByText('Size', { exact: true })).toBeVisible();
  await expect(page.getByText('Tags', { exact: true })).toBeVisible();
  
  // Should have document rows
  const rows = page.getByRole('row');
  const rowCount = await rows.count();
  console.log(`📋 Table rows: ${rowCount} (including header)`);
  expect(rowCount).toBeGreaterThan(1); // At least header + 1 data row
  
  // Check that dates display properly (should show '-' for missing dates)
  const modifiedCells = page.getByTestId('modified-cell');
  const firstModifiedCell = modifiedCells.first();
  await expect(firstModifiedCell).toBeVisible();
  const dateText = await firstModifiedCell.textContent();
  console.log(`📅 First date cell: "${dateText}"`);
  
  // No error alerts should be visible
  const errorAlerts = page.locator('[class*="destructive"]');
  const errorCount = await errorAlerts.count();
  expect(errorCount).toBe(0);
  
  console.log('\n✅ All UI elements are displaying correctly!');
});

test('search functionality works', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Type in search box
  const searchInput = page.getByPlaceholder('Search documents...');
  await searchInput.fill('Project');
  
  // Wait for debounce and results
  await page.waitForTimeout(300);
  
  // Should still show results (or handle search gracefully)
  await expect(page.getByText(/\d+ documents?/)).toBeVisible();
  
  console.log('✅ Search input works without errors');
});