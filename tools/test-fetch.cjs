#!/usr/bin/env node

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Testing direct API fetch from browser context...\n');
  
  // Navigate to the app first to get same-origin context
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  // Test direct fetch from browser console
  const result = await page.evaluate(async () => {
    const url = 'http://localhost:3001/api/vaults/Personal/documents?limit=10&offset=0';
    console.log('Fetching:', url);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          headers: Object.fromEntries(response.headers.entries())
        };
      }
      
      const data = await response.json();
      return {
        success: true,
        status: response.status,
        documentCount: data.documents?.length || 0,
        total: data.total,
        vaultTotal: data.vaultTotal,
        firstDoc: data.documents?.[0]?.path || null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
        name: error.name
      };
    }
  });
  
  console.log('Fetch result:', JSON.stringify(result, null, 2));
  
  // Also check what's in the console
  const consoleLogs = await page.evaluate(() => {
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog.apply(console, args);
    };
    return logs;
  });
  
  if (consoleLogs.length > 0) {
    console.log('\nConsole logs from fetch:');
    consoleLogs.forEach(log => console.log('  ', log));
  }
  
  await browser.close();
  process.exit(result.success ? 0 : 1);
})();