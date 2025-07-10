import { test, expect } from '@playwright/test';

test('debug styling and table structure', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Check if CSS is loaded
  const stylesheets = await page.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    return sheets.map(sheet => ({
      href: sheet.href,
      rules: sheet.cssRules ? sheet.cssRules.length : 0
    }));
  });
  console.log('\n📋 Stylesheets loaded:', stylesheets);
  
  // Check for Tailwind classes
  const cardElement = await page.locator('.card').first();
  const hasCard = await cardElement.count() > 0;
  console.log(`\n🎨 Has .card class: ${hasCard}`);
  
  // Check table structure
  const table = await page.locator('table').first();
  const hasTable = await table.count() > 0;
  console.log(`📊 Has <table> element: ${hasTable}`);
  
  // Get the actual HTML structure of the document table area
  const tableAreaHtml = await page.locator('text=/documents/').locator('..').locator('..').innerHTML();
  console.log('\n📄 Table area HTML (first 500 chars):\n', tableAreaHtml.substring(0, 500));
  
  // Check for any inline styles
  const rootElement = page.locator('#root');
  const computedStyles = await rootElement.evaluate(el => {
    const styles = window.getComputedStyle(el);
    return {
      backgroundColor: styles.backgroundColor,
      fontFamily: styles.fontFamily,
      hasClasses: el.className
    };
  });
  console.log('\n🎨 Root element styles:', computedStyles);
  
  // Check if TableView component rendered
  const tableViewContent = await page.locator('text=/Name.*Path.*Modified/').count();
  console.log(`\n📋 Table headers found together: ${tableViewContent > 0}`);
  
  // Take a screenshot for manual inspection
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
  console.log('\n📸 Screenshot saved as debug-screenshot.png');
});