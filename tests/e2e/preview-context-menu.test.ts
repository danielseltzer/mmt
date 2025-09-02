import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let serverProcess: ChildProcess | null = null;

test.describe('Document Preview Context Menu', () => {
  test.beforeAll(async () => {
    console.log('Starting MMT server...');
    
    // Start the server
    serverProcess = spawn('./bin/mmt', ['start', '--config', 'config/test/multi-vault-test-config.yaml'], {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Wait for server to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server failed to start within 30 seconds'));
      }, 30000);

      serverProcess?.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('Server output:', output);
        if (output.includes('Web server listening on') || output.includes('API server running')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      serverProcess?.stderr?.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      serverProcess?.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    // Give it a bit more time to fully initialize
    await sleep(2000);
    console.log('Server started successfully');
  });

  test.afterAll(async () => {
    if (serverProcess) {
      console.log('Stopping server...');
      serverProcess.kill('SIGTERM');
      
      // Wait for process to exit
      await new Promise<void>((resolve) => {
        serverProcess?.on('exit', () => {
          console.log('Server stopped');
          resolve();
        });
        
        // Force kill after 5 seconds if it doesn't exit gracefully
        setTimeout(() => {
          if (serverProcess && !serverProcess.killed) {
            console.log('Force killing server...');
            serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      });
    }
  });

  test('Preview option appears first in context menu and opens modal', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for vaults to load and click on first vault
    await page.waitForSelector('[data-testid="vault-card"]', { timeout: 10000 });
    await page.click('[data-testid="vault-card"]');
    
    // Wait for table to load with data rows
    await page.waitForSelector('[data-testid^="row-"]', { timeout: 10000 });
    
    // Get first data row
    const firstRow = page.locator('[data-testid^="row-"]').first();
    await expect(firstRow).toBeVisible();
    
    // Right-click on the row to open context menu
    await firstRow.click({ button: 'right' });
    
    // Wait for context menu to appear
    const contextMenu = page.locator('.fixed.bg-background');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });
    
    // Get all menu items
    const menuButtons = contextMenu.locator('button');
    const menuCount = await menuButtons.count();
    expect(menuCount).toBeGreaterThan(0);
    
    // Verify Preview is the first item
    const firstMenuItem = menuButtons.first();
    await expect(firstMenuItem).toHaveText('Preview');
    
    // Click on Preview
    await firstMenuItem.click();
    
    // Wait for modal to appear with title "Document Preview"
    const modal = page.locator('h2:has-text("Document Preview")');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Verify preview content section exists
    const previewContent = page.locator('pre').first();
    await expect(previewContent).toBeVisible();
    
    // Check that some content is loaded (either actual content or loading state)
    const contentText = await previewContent.textContent();
    expect(contentText).toBeDefined();
    
    // Close the modal using the X button
    const closeButton = page.locator('button[aria-label="Close"], button:has(svg)').filter({ 
      has: page.locator('svg.lucide-x') 
    }).first();
    
    if (await closeButton.isVisible()) {
      await closeButton.click();
      // Verify modal is closed
      await expect(modal).not.toBeVisible();
    } else {
      // Alternative: Click outside the modal to close it
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });

  test('Preview modal displays document metadata', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for vaults to load and click on first vault
    await page.waitForSelector('[data-testid="vault-card"]', { timeout: 10000 });
    await page.click('[data-testid="vault-card"]');
    
    // Wait for table to load
    await page.waitForSelector('[data-testid^="row-"]', { timeout: 10000 });
    
    // Right-click on first row
    const firstRow = page.locator('[data-testid^="row-"]').first();
    await firstRow.click({ button: 'right' });
    
    // Click Preview in context menu
    await page.locator('button:has-text("Preview")').first().click();
    
    // Wait for modal
    await expect(page.locator('h2:has-text("Document Preview")')).toBeVisible({ timeout: 5000 });
    
    // Check for metadata fields
    const metadataSection = page.locator('.space-y-2').first();
    
    // Look for common metadata fields (at least one should be present)
    const sizeField = metadataSection.locator('text=/Size:/');
    const modifiedField = metadataSection.locator('text=/Modified:/');
    
    // At least one metadata field should be visible
    const hasSizeField = await sizeField.isVisible().catch(() => false);
    const hasModifiedField = await modifiedField.isVisible().catch(() => false);
    
    expect(hasSizeField || hasModifiedField).toBeTruthy();
  });
});