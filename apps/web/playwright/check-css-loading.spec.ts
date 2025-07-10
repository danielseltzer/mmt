import { test } from '@playwright/test';

test('check CSS loading and classes', async ({ page }) => {
  await page.goto('/');
  
  // Get the page source
  const htmlContent = await page.content();
  
  // Check for CSS link tags
  const cssLinks = await page.locator('link[rel="stylesheet"]').count();
  console.log(`\n📋 CSS link tags found: ${cssLinks}`);
  
  // Check for style tags
  const styleTags = await page.locator('style').count();
  console.log(`📋 Style tags found: ${styleTags}`);
  
  // Get the first style tag content
  if (styleTags > 0) {
    const firstStyle = await page.locator('style').first().innerHTML();
    console.log(`\n🎨 First style tag (first 200 chars):\n${firstStyle.substring(0, 200)}...`);
  }
  
  // Check specific elements for Tailwind classes
  const appDiv = await page.locator('#root > div').first();
  const appClasses = await appDiv.getAttribute('class');
  console.log(`\n🏷️ App div classes: "${appClasses}"`);
  
  // Check Card component
  const cardElements = await page.locator('[class*="rounded"]').count();
  console.log(`\n🎴 Elements with 'rounded' in class: ${cardElements}`);
  
  // Check if Tailwind reset is applied
  const bodyStyles = await page.evaluate(() => {
    const body = document.body;
    const styles = window.getComputedStyle(body);
    return {
      margin: styles.margin,
      lineHeight: styles.lineHeight,
      fontFamily: styles.fontFamily
    };
  });
  console.log('\n🎨 Body styles:', bodyStyles);
  
  // Save page source for inspection
  await page.evaluate(() => {
    console.log('Page HTML classes:', document.documentElement.outerHTML.match(/class="[^"]*"/g)?.slice(0, 10));
  });
});