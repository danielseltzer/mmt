import { test } from '@playwright/test';

test('take screenshot to see visual alignment issue', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot of just the table
  const table = page.locator('table');
  await table.screenshot({ path: 'table-alignment-issue.png' });
  console.log('📸 Screenshot saved as table-alignment-issue.png');
  
  // Also check computed styles for a few cells to debug
  const firstRow = page.locator('tbody tr').first();
  const cells = await firstRow.locator('td').all();
  
  console.log('\n🔍 First row cell analysis:');
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const text = await cell.textContent();
    const bbox = await cell.boundingBox();
    console.log(`Cell ${i}: "${text?.substring(0, 20)}..." x=${bbox?.x} width=${bbox?.width}`);
  }
  
  // Check if overflow is causing issues
  const pathCell = await firstRow.locator('td:nth-child(3)').first();
  const pathSpan = await pathCell.locator('span').first();
  const spanBox = await pathSpan.boundingBox();
  const cellBox = await pathCell.boundingBox();
  
  console.log('\n📐 Path cell overflow check:');
  console.log(`Cell width: ${cellBox?.width}`);
  console.log(`Span width: ${spanBox?.width}`);
  console.log(`Overflow: ${(spanBox?.width || 0) > (cellBox?.width || 0) ? 'YES' : 'NO'}`);
});