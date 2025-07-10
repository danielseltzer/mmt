import { test } from '@playwright/test';

test('debug why table cells are not aligning', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Get the actual rendered HTML of the table
  const tableHTML = await page.locator('table').innerHTML();
  console.log('\n📋 Table HTML structure (first 1000 chars):');
  console.log(tableHTML.substring(0, 1000));
  
  // Check if widths are actually being applied
  console.log('\n📏 Cell width comparison:');
  
  // Get all cells in the second column (Name)
  const nameColumnCells = await page.locator('tbody tr td:nth-child(2)').all();
  console.log(`Found ${nameColumnCells.length} cells in Name column`);
  
  for (let i = 0; i < Math.min(3, nameColumnCells.length); i++) {
    const cell = nameColumnCells[i];
    const bbox = await cell.boundingBox();
    const styles = await cell.evaluate(el => ({
      width: window.getComputedStyle(el).width,
      display: window.getComputedStyle(el).display,
      boxSizing: window.getComputedStyle(el).boxSizing
    }));
    console.log(`Cell ${i}: x=${bbox?.x}, width=${bbox?.width}, computed=${styles.width}`);
  }
  
  // Check parent container
  const tableContainer = await page.locator('table').locator('..');
  const containerStyles = await tableContainer.evaluate(el => ({
    display: window.getComputedStyle(el).display,
    overflow: window.getComputedStyle(el).overflow,
    width: window.getComputedStyle(el).width
  }));
  console.log('\n📦 Table container styles:', containerStyles);
});