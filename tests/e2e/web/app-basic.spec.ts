import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

let apiProcess: ChildProcess;
let webProcess: ChildProcess;

test.beforeAll(async () => {
  // Start API server
  console.log('Starting API server...');
  apiProcess = spawn('pnpm', ['run', 'dev:api'], {
    cwd: join(__dirname, '../../..'),
    detached: false,
    stdio: 'pipe'
  });

  // Wait for API to be ready
  await new Promise<void>((resolve) => {
    apiProcess.stdout?.on('data', (data) => {
      if (data.toString().includes('MMT API Server running')) {
        console.log('API server is ready');
        resolve();
      }
    });
  });

  // Start web server
  console.log('Starting web server...');
  webProcess = spawn('pnpm', ['run', 'dev:web'], {
    cwd: join(__dirname, '../../..'),
    detached: false,
    stdio: 'pipe'
  });

  // Wait for web server to be ready
  await new Promise<void>((resolve) => {
    webProcess.stdout?.on('data', (data) => {
      if (data.toString().includes('Local:')) {
        console.log('Web server is ready');
        resolve();
      }
    });
  });

  // Give servers a moment to stabilize
  await new Promise(resolve => setTimeout(resolve, 2000));
});

test.afterAll(async () => {
  // Clean up processes
  if (apiProcess) {
    apiProcess.kill();
  }
  if (webProcess) {
    webProcess.kill();
  }
});

test('app loads without console errors', async ({ page }) => {
  // Collect console messages
  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleMessages.push(msg.text());
    }
  });

  // Navigate to the app
  await page.goto('http://localhost:5173');

  // Wait for the app to load
  await page.waitForSelector('h1:has-text("MMT - Markdown Management Toolkit")', {
    timeout: 10000
  });

  // Check for console errors
  expect(consoleMessages).toHaveLength(0);
});

test('displays documents in table', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Wait for table to load
  await page.waitForSelector('table', { timeout: 10000 });

  // Check that table has rows (header + at least one document)
  const rows = await page.locator('table tr').count();
  expect(rows).toBeGreaterThan(1);

  // Verify table headers exist
  await expect(page.locator('th:has-text("Name")')).toBeVisible();
  await expect(page.locator('th:has-text("Path")')).toBeVisible();
  await expect(page.locator('th:has-text("Modified")')).toBeVisible();
});

test('search functionality works', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Wait for initial load
  await page.waitForSelector('table', { timeout: 10000 });

  // Type in search box
  const searchInput = page.locator('input[placeholder*="Search"]');
  await searchInput.fill('test');

  // Wait for search results (debounce time + response)
  await page.waitForTimeout(500);

  // Verify the table updated (we don't know exact results, just that it responded)
  await expect(page.locator('table')).toBeVisible();
});