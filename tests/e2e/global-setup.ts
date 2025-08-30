import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // The app should already be running via ./bin/mmt start
  // This setup just ensures we can connect
  
  console.log('Running global setup for E2E tests...');
  
  // Try to connect to the app to verify it's running
  // Always run headless for setup check
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 5000 });
    console.log('✓ App is running at http://localhost:5173');
  } catch (error) {
    console.error('✗ App is not running. Please run: ./bin/mmt start --config config/multi-vault.yaml');
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;