import { test, expect, ElectronApplication } from '@playwright/test';
import { _electron as electron } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let viteProcess: ChildProcess;
let electronApp: ElectronApplication;

test.describe('Dev Server Tests', () => {
  test.beforeAll(async () => {
    // Start Vite dev server
    console.log('Starting Vite dev server...');
    viteProcess = spawn('pnpm', ['--filter', '@mmt/electron-renderer', 'dev'], {
      stdio: 'pipe',
      shell: true,
    });

    // Wait for Vite to be ready
    await new Promise((resolve) => {
      viteProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('Vite:', output);
        if (output.includes('ready in')) {
          resolve(true);
        }
      });
    });

    // Wait a bit more to ensure server is fully ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Launch Electron
    console.log('Launching Electron...');
    const mainPath = join(__dirname, '../../apps/electron-main/dist/main-dev.js');
    electronApp = await electron.launch({
      args: [mainPath],
      env: {
        ...process.env,
        NODE_ENV: 'development',
      },
    });

    // Wait for the first window
    await electronApp.firstWindow();
  });

  test.afterAll(async () => {
    // Close Electron
    if (electronApp) {
      await electronApp.close();
    }

    // Kill Vite
    if (viteProcess) {
      viteProcess.kill();
    }
  });

  test('should display the app UI', async () => {
    const page = await electronApp.firstWindow();
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Check the title
    const title = await page.title();
    expect(title).toBe('MMT - Markdown Management Toolkit');
    
    // Check main components are visible
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('h1:has-text("Markdown Management Toolkit")')).toBeVisible();
    await expect(page.locator('input[placeholder*="Enter query"]')).toBeVisible();
    await expect(page.locator('button:has-text("Search")')).toBeVisible();
  });

  test('should allow typing in query input', async () => {
    const page = await electronApp.firstWindow();
    
    const queryInput = page.locator('input[placeholder*="Enter query"]');
    await queryInput.fill('tag:important');
    await expect(queryInput).toHaveValue('tag:important');
    
    // Clear should work
    const clearButton = page.locator('button:has-text("Clear")');
    await clearButton.click();
    await expect(queryInput).toHaveValue('');
  });
});