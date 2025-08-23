#!/usr/bin/env node

import { chromium } from 'playwright';

async function testObsidianURLs() {
  console.log('=== Testing Open in Obsidian URLs ===\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox'] 
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let testResults = [];
  let failureDetails = [];
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    console.log('✅ Page loaded');
    
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });
    console.log('✅ Table found');
    
    // Wait for rows to load
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    const rows = await page.$$('tbody tr');
    console.log(`✅ Found ${rows.length} document rows\n`);
    
    if (rows.length === 0) {
      console.log('❌ No documents found to test');
      return;
    }
    
    // Test up to 5 random documents from the first 100
    const numTests = Math.min(5, Math.min(rows.length, 100));
    const maxIndex = Math.min(rows.length, 100);
    const testedIndices = new Set();
    
    console.log(`Testing ${numTests} random documents from the first ${maxIndex} items...\n`);
    
    for (let testNum = 0; testNum < numTests; testNum++) {
      // Pick a random row that we haven't tested yet
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * maxIndex);
      } while (testedIndices.has(randomIndex));
      testedIndices.add(randomIndex);
      
      console.log(`\nTest ${testNum + 1}/${numTests}: Document at index ${randomIndex}`);
      
      const row = rows[randomIndex];
      
      // Get the document name and path from the row
      const cells = await row.$$('td');
      if (cells.length < 2) {
        console.log('❌ Row has insufficient cells');
        continue;
      }
      
      // First cell is checkbox, second is name, third is path
      const nameCell = cells[1];
      const pathCell = cells[2];
      
      const documentName = await nameCell.textContent();
      const documentPath = await pathCell.textContent();
      
      console.log(`  Document: "${documentName}"`);
      console.log(`  Path shown: "${documentPath}"`);
      
      // First, click the checkbox to select the row
      const checkbox = await row.$('input[type="checkbox"]');
      if (checkbox) {
        await checkbox.click();
        await page.waitForTimeout(100); // Wait for selection to register
      } else {
        // If no checkbox, just click the row
        await row.click();
        await page.waitForTimeout(100);
      }
      
      // Right-click to open context menu
      await row.click({ button: 'right' });
      
      // Wait for context menu to appear
      await page.waitForSelector('.fixed.bg-background.border.rounded-md.shadow-lg', { timeout: 2000 });
      
      // Find the "Open in Obsidian" button and extract its onclick handler
      const openButton = await page.$('button:has-text("Open in Obsidian")');
      
      if (!openButton) {
        console.log('  ❌ "Open in Obsidian" button not found');
        testResults.push(false);
        failureDetails.push(`Row ${randomIndex}: Button not found`);
        continue;
      }
      
      // Intercept the window.open call to capture the URL
      let capturedUrl = null;
      await page.evaluateHandle(() => {
        window._originalOpen = window.open;
        window.open = (url) => {
          window._lastOpenUrl = url;
          return null; // Don't actually open
        };
      });
      
      // Click the button
      await openButton.click();
      
      // Get the captured URL
      capturedUrl = await page.evaluate(() => window._lastOpenUrl);
      
      // Restore original window.open
      await page.evaluateHandle(() => {
        window.open = window._originalOpen;
      });
      
      if (!capturedUrl) {
        console.log('  ❌ No URL was generated');
        testResults.push(false);
        failureDetails.push(`Row ${randomIndex}: No URL generated`);
        continue;
      }
      
      console.log(`  Generated URL: ${capturedUrl}`);
      
      // Parse the URL
      const url = new URL(capturedUrl);
      const vault = url.searchParams.get('vault');
      const file = url.searchParams.get('file');
      
      console.log(`  Parsed vault: "${vault}"`);
      console.log(`  Parsed file: "${file}"`);
      
      // Validate the URL components
      let isValid = true;
      let issues = [];
      
      // Check vault name
      if (vault !== 'Personal-sync') {
        issues.push(`Vault should be "Personal-sync" but got "${vault}"`);
        isValid = false;
      }
      
      // Check file path
      // The file path should correspond to the document
      // For root files (path = "/"), the file should be just the document name with .md
      // For subfolder files (path = "/Folder"), the file should be /Folder/documentName.md
      
      let expectedFilePath;
      if (documentPath === '/') {
        // Root file
        expectedFilePath = `/${documentName}.md`;
      } else {
        // Subfolder file
        const cleanPath = documentPath.startsWith('/') ? documentPath : '/' + documentPath;
        expectedFilePath = `${cleanPath}/${documentName}.md`;
      }
      
      console.log(`  Expected file path: "${expectedFilePath}"`);
      
      if (file !== expectedFilePath) {
        issues.push(`File path mismatch: expected "${expectedFilePath}" but got "${file}"`);
        isValid = false;
      }
      
      if (isValid) {
        console.log('  ✅ URL is correct');
        testResults.push(true);
      } else {
        console.log('  ❌ URL has issues:');
        issues.forEach(issue => console.log(`     - ${issue}`));
        testResults.push(false);
        failureDetails.push(`Row ${randomIndex} (${documentName}): ${issues.join(', ')}`);
      }
      
      // Close context menu if still open
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY');
    console.log('='.repeat(50));
    
    const passed = testResults.filter(r => r).length;
    const failed = testResults.filter(r => !r).length;
    
    console.log(`Total tests: ${testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFailure details:');
      failureDetails.forEach(detail => console.log(`  - ${detail}`));
      console.log('\n❌ TEST SUITE FAILED');
      process.exit(1);
    } else {
      console.log('\n✅ ALL TESTS PASSED');
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testObsidianURLs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});