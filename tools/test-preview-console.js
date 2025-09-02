#!/usr/bin/env node

import { chromium } from 'playwright';

const testPreviewConsole = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('[Console]', text);
  });
  
  try {
    // Navigate to app
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid^="tab-trigger-"]', { timeout: 15000 });
    
    // Click first tab
    const firstTab = page.locator('[data-testid^="tab-trigger-"]').first();
    await firstTab.click();
    
    // Wait for table rows
    await page.waitForSelector('[data-testid^="row-"]', { timeout: 15000 });
    
    // Right-click first row
    const firstRow = page.locator('[data-testid^="row-"]').first();
    await firstRow.click({ button: 'right' });
    
    // Click Preview
    const contextMenu = page.locator('.fixed.bg-background');
    await contextMenu.locator('button').first().click();
    
    // Wait a bit for console logs
    await page.waitForTimeout(3000);
    
    // Filter for Preview-related logs
    console.log('\n=== Preview Modal Logs ===');
    const previewLogs = logs.filter(log => log.includes('DocumentPreviewModal'));
    previewLogs.forEach(log => console.log(log));
    
    if (previewLogs.length === 0) {
      console.log('No DocumentPreviewModal logs found!');
    }
    
  } finally {
    await browser.close();
  }
};

testPreviewConsole().catch(console.error);