import puppeteer from 'puppeteer';

async function debugFetch() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Enable request interception to see network activity
    await page.setRequestInterception(true);
    
    const requests = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/')) {
        console.log(`📤 Request: ${request.method()} ${url}`);
        requests.push({
          method: request.method(),
          url: url,
          time: new Date().toISOString()
        });
      }
      request.continue();
    });
    
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/')) {
        console.log(`📥 Response: ${response.status()} ${url}`);
      }
    });
    
    page.on('requestfailed', request => {
      const url = request.url();
      if (url.includes('/api/')) {
        console.log(`❌ Request Failed: ${url} - ${request.failure().errorText}`);
      }
    });
    
    // Log console messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('fetch') || text.includes('documents') || text.includes('error')) {
        console.log(`🖥️  Console [${msg.type()}]: ${text}`);
      }
    });
    
    // Navigate to the page
    console.log('\n=== Navigating to http://localhost:5173 ===\n');
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    // Wait a bit for any async operations
    await page.waitForTimeout(5000);
    
    // Check if fetch was called from console
    const fetchCalls = await page.evaluate(() => {
      // Try to get any pending promises
      return window.performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('/api/'))
        .map(entry => ({
          url: entry.name,
          duration: entry.duration,
          status: entry.transferSize === 0 ? 'cached/failed' : 'success'
        }));
    });
    
    console.log('\n=== Performance API Entries ===');
    console.log(JSON.stringify(fetchCalls, null, 2));
    
    console.log('\n=== Summary ===');
    console.log(`Total API requests intercepted: ${requests.length}`);
    requests.forEach(req => {
      console.log(`  - ${req.method} ${req.url}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugFetch().catch(console.error);