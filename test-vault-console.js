const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture all console messages
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    console.log(`[${msg.type()}] ${text}`);
  });
  
  // Navigate to the app
  console.log('=== Navigating to http://localhost:5173 ===');
  await page.goto('http://localhost:5173');
  
  // Wait a bit for everything to load
  await page.waitForTimeout(3000);
  
  console.log('\n=== Console logs summary ===');
  console.log(`Total logs captured: ${logs.length}`);
  
  // Filter for vault-related logs
  console.log('\n=== Vault-related logs ===');
  logs.filter(log => log.toLowerCase().includes('vault')).forEach(log => console.log(log));
  
  await browser.close();
})();