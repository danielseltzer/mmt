import { test } from '@playwright/test';

test('debug column widths and alignment', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  console.log('\n📏 Column Width Analysis:');
  
  // Get all header cells and their widths
  const headers = await page.locator('thead th').all();
  for (let i = 0; i < headers.length; i++) {
    const width = await headers[i].evaluate(el => {
      return {
        offsetWidth: el.offsetWidth,
        styleWidth: el.style.width,
        computedWidth: window.getComputedStyle(el).width
      };
    });
    const text = await headers[i].textContent();
    console.log(`Header ${i} (${text}):`, width);
  }
  
  console.log('\n📊 First Row Cell Widths:');
  
  // Get first data row cells and their widths
  const firstRowCells = await page.locator('tbody tr').first().locator('td').all();
  for (let i = 0; i < firstRowCells.length; i++) {
    const width = await firstRowCells[i].evaluate(el => {
      return {
        offsetWidth: el.offsetWidth,
        styleWidth: el.style.width,
        computedWidth: window.getComputedStyle(el).width
      };
    });
    const text = await firstRowCells[i].textContent();
    console.log(`Cell ${i} (${text?.substring(0, 20)}...):`, width);
  }
  
  // Check table layout
  const table = page.locator('table').first();
  const tableStyles = await table.evaluate(el => {
    const styles = window.getComputedStyle(el);
    return {
      tableLayout: styles.tableLayout,
      width: styles.width,
      borderCollapse: styles.borderCollapse
    };
  });
  console.log('\n🎨 Table styles:', tableStyles);
});