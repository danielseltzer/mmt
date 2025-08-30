import { test } from '@playwright/test';

test('verify documents are displaying', async ({ page }) => {
  console.log('Loading page...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(5000); // Give it time to load
  
  // Get all text content
  const bodyText = await page.locator('body').innerText();
  
  console.log('\n=== Page Content Check ===');
  
  // Check for key indicators
  const checks = {
    'Loading documents...': bodyText.includes('Loading documents...'),
    'No documents': bodyText.includes('No documents'),
    'Table with rows': await page.locator('table tbody tr').count() > 0,
    'Document count (5992)': bodyText.includes('5992'),
    'Document count element': await page.locator('[data-testid="document-count"]').count() > 0,
    'Table element exists': await page.locator('table').count() > 0,
    'FilterBar visible': await page.locator('text=/Select.*All/').count() > 0,
    'Has .md file names': bodyText.includes('.md'),
  };
  
  for (const [check, result] of Object.entries(checks)) {
    console.log(`${result ? '✅' : '❌'} ${check}`);
  }
  
  // Get document count if available
  const docCountElement = page.locator('[data-testid="document-count"]');
  if (await docCountElement.count() > 0) {
    const countText = await docCountElement.innerText();
    console.log(`\nDocument count text: "${countText}"`);
  }
  
  // Check table rows
  const tableRows = await page.locator('table tbody tr').count();
  console.log(`\nTable rows found: ${tableRows}`);
  
  // Sample some text from the page
  console.log('\n=== Sample Page Text (first 500 chars) ===');
  console.log(bodyText.substring(0, 500));
  
  // Check if stuck on loading
  if (bodyText.includes('Loading documents...')) {
    console.log('\n⚠️  WARNING: Page is stuck showing "Loading documents..."');
  }
  
  // Take screenshot for debugging
  await page.screenshot({ path: '/tmp/mmt-current-state.png', fullPage: true });
  console.log('\n📸 Screenshot saved to /tmp/mmt-current-state.png');
});