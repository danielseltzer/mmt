const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Set up console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
  
  // Navigate to the app
  await page.goto('http://localhost:5173');
  
  // Wait for the app to load
  await page.waitForSelector('[data-testid="document-table"]', { timeout: 10000 }).catch(() => {
    console.log('Document table not found, waiting for any table...');
    return page.waitForSelector('table', { timeout: 10000 });
  });
  
  console.log('Page loaded, looking for similarity button...');
  
  // Find and click a similarity button
  const similarButton = await page.$$('button:has-text("Similar")').catch(() => null);
  if (!similarButton || similarButton.length === 0) {
    console.log('No similarity buttons found, trying another selector...');
    const buttons = await page.$$eval('button', buttons => 
      buttons.map(b => ({ text: b.textContent, classes: b.className }))
    );
    console.log('Available buttons:', buttons);
  } else {
    console.log(`Found ${similarButton.length} similarity buttons`);
    await similarButton[0].click();
    console.log('Clicked similarity button');
  }
  
  // Wait a bit to see the result
  await page.waitForTimeout(5000);
  
  // Check for errors
  const errorElement = await page.$('[role="alert"]').catch(() => null);
  if (errorElement) {
    const errorText = await errorElement.evaluate(el => el.textContent);
    console.log('ERROR FOUND:', errorText);
  }
  
  await browser.close();
})();