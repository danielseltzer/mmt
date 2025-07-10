import { test } from '@playwright/test';

test('debug table structure and cell alignment', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Check table structure
  console.log('\n📊 Table Structure Analysis:');
  
  // Count table elements
  const tables = await page.locator('table').count();
  const theads = await page.locator('thead').count();
  const tbodies = await page.locator('tbody').count();
  const headerRows = await page.locator('thead tr').count();
  const dataRows = await page.locator('tbody tr').count();
  
  console.log(`Tables: ${tables}, THeads: ${theads}, TBodies: ${tbodies}`);
  console.log(`Header rows: ${headerRows}, Data rows: ${dataRows}`);
  
  // Check header cells
  const headerCells = await page.locator('thead th').count();
  console.log(`Header cells (th): ${headerCells}`);
  
  // Check data cells
  const dataCells = await page.locator('tbody td').count();
  console.log(`Data cells (td): ${dataCells}`);
  
  // Get first data row structure
  if (dataRows > 0) {
    const firstRowCells = await page.locator('tbody tr').first().locator('td').count();
    console.log(`First data row has ${firstRowCells} cells`);
    
    // Get the HTML of the first data row
    const firstRowHTML = await page.locator('tbody tr').first().innerHTML();
    console.log('\n📄 First data row HTML:');
    console.log(firstRowHTML);
  }
  
  // Check if cells have borders
  const firstCell = page.locator('tbody td').first();
  if (await firstCell.count() > 0) {
    const cellStyles = await firstCell.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        border: styles.border,
        borderWidth: styles.borderWidth,
        borderStyle: styles.borderStyle,
        borderColor: styles.borderColor,
        padding: styles.padding,
        display: styles.display
      };
    });
    console.log('\n🎨 First cell styles:', cellStyles);
  }
});