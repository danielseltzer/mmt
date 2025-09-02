#!/usr/bin/env node

/**
 * Test script to verify the Preview option in the context menu
 * This script tests that:
 * 1. Right-clicking on a table row shows a context menu
 * 2. The "Preview" option appears as the first item
 * 3. Clicking Preview opens the document preview modal
 */

import puppeteer from 'puppeteer';

async function testPreviewContextMenu() {
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI
    devtools: false,
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to the app
    console.log('📍 Navigating to application...');
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for vaults to load
    await page.waitForSelector('[data-testid="vault-card"]', { timeout: 10000 });
    
    // Click on first vault
    console.log('📍 Clicking on first vault...');
    await page.click('[data-testid="vault-card"]');
    
    // Wait for table to load
    await page.waitForSelector('[data-testid^="row-"]', { timeout: 10000 });
    
    // Find first data row
    const firstRow = await page.$('[data-testid^="row-"]');
    if (!firstRow) {
      throw new Error('No table rows found');
    }
    
    // Get row position for right-click
    const box = await firstRow.boundingBox();
    if (!box) {
      throw new Error('Could not get row position');
    }
    
    // Right-click on the row
    console.log('📍 Right-clicking on first table row...');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
    
    // Wait for context menu to appear
    await page.waitForSelector('button:has-text("Preview")', { 
      timeout: 5000,
      visible: true 
    }).catch(async () => {
      // Fallback: check for any button containing "Preview" text
      const buttons = await page.$$eval('button', buttons => 
        buttons.map(b => b.textContent)
      );
      console.log('Available buttons:', buttons);
      throw new Error('Preview button not found in context menu');
    });
    
    console.log('✅ Preview option found in context menu');
    
    // Get all context menu items to verify order
    const menuItems = await page.$$eval(
      '.fixed.bg-background button',
      buttons => buttons.map(b => b.textContent?.trim())
    );
    
    console.log('Context menu items:', menuItems);
    
    // Verify Preview is first
    if (menuItems[0] !== 'Preview') {
      throw new Error(`Preview is not the first item. Order: ${menuItems.join(', ')}`);
    }
    
    console.log('✅ Preview is the first item in context menu');
    
    // Click on Preview
    console.log('📍 Clicking Preview...');
    await page.click('button:has-text("Preview")');
    
    // Wait for modal to appear
    await page.waitForSelector('h2:has-text("Document Preview")', { 
      timeout: 5000,
      visible: true 
    }).catch(async () => {
      // Check if modal appeared with different selector
      const modalTitle = await page.$eval('h2', h2 => h2.textContent).catch(() => null);
      if (modalTitle?.includes('Preview')) {
        return; // Modal found
      }
      throw new Error('Document Preview modal did not appear');
    });
    
    console.log('✅ Document Preview modal opened successfully');
    
    // Check if preview content loaded
    const hasPreviewContent = await page.evaluate(() => {
      const preElements = document.querySelectorAll('pre');
      return preElements.length > 0 && preElements[0].textContent?.length > 0;
    });
    
    if (hasPreviewContent) {
      console.log('✅ Preview content loaded successfully');
    } else {
      console.log('⚠️  Warning: Preview content may not have loaded');
    }
    
    // Close modal
    const closeButton = await page.$('button[aria-label="Close"]');
    if (closeButton) {
      await closeButton.click();
      console.log('✅ Modal closed successfully');
    }
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the test
testPreviewContextMenu().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});