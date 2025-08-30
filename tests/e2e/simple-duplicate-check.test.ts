import { test, expect } from '@playwright/test';

test('should not show duplicate documents in the table', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:5173');
  
  // Wait a bit for documents to load
  await page.waitForTimeout(3000);
  
  // Check if document table exists
  const table = page.locator('[data-testid="document-table"]');
  await expect(table).toBeVisible({ timeout: 10000 });
  
  // Get all table rows (excluding header)
  const rows = await page.locator('tbody tr').all();
  console.log(`Found ${rows.length} document rows`);
  
  // Extract the document paths (looking for path data in rows)
  const paths: string[] = [];
  for (const row of rows) {
    // Try to get the row's data-testid which contains the path
    const testId = await row.getAttribute('data-testid');
    if (testId && testId.startsWith('row-')) {
      const path = testId.substring(4); // Remove 'row-' prefix
      paths.push(path);
    }
  }
  
  console.log(`Extracted ${paths.length} paths`);
  
  // Check for duplicates
  const uniquePaths = new Set(paths);
  const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
  
  if (duplicates.length > 0) {
    console.error('Found duplicate paths:', duplicates);
  }
  
  // Assert no duplicates
  expect(paths.length).toBe(uniquePaths.size);
  expect(duplicates).toHaveLength(0);
});