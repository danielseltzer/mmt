#!/usr/bin/env node

import { chromium } from 'playwright';

async function testContextMenu() {
  console.log('=== Testing Context Menu ===\n');
  
  const browser = await chromium.launch({ headless: false }); // Run with UI to see what's happening
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    console.log('✅ Page loaded');
    
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 5000 });
    console.log('✅ Table found');
    
    // Wait for rows to load
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    const rows = await page.$$('tbody tr');
    console.log(`✅ Found ${rows.length} document rows`);
    
    if (rows.length > 0) {
      // Right-click on the first row
      const firstRow = rows[0];
      await firstRow.click({ button: 'right' });
      console.log('✅ Right-clicked on first row');
      
      // Wait a bit for context menu
      await page.waitForTimeout(500);
      
      // Try to find context menu
      const contextMenu = await page.$('.fixed.bg-background.border.rounded-md.shadow-lg');
      if (contextMenu) {
        console.log('✅ Context menu appeared');
        
        // Get all buttons in the context menu
        const buttons = await contextMenu.$$('button');
        console.log(`Found ${buttons.length} buttons in context menu`);
        
        for (let i = 0; i < buttons.length; i++) {
          const text = await buttons[i].textContent();
          console.log(`  Button ${i + 1}: "${text.trim()}"`);
        }
      } else {
        console.log('❌ Context menu did not appear');
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'context-menu-debug.png' });
        console.log('Screenshot saved to context-menu-debug.png');
      }
    }
    
    console.log('\nNote: Browser window will remain open for 5 seconds for inspection');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testContextMenu().catch(console.error);