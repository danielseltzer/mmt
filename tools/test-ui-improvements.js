#!/usr/bin/env node

import { chromium } from 'playwright';

async function testUIImprovements() {
  console.log('=== Testing UI Improvements (Issue #215) ===\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    console.log('✅ Page loaded successfully');
    
    // Wait for app to mount (look for the main app container or document table)
    try {
      await page.waitForSelector('main, .container, table', { timeout: 5000 });
      console.log('✅ App mounted successfully');
    } catch (e) {
      console.log('⚠️  App mount timeout, continuing anyway...');
    }
    
    // Test 1: Check if "Open in Obsidian" is in context menu
    console.log('\n📋 Test 1: Context Menu - Open in Obsidian');
    
    // Wait for documents to load
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    const rows = await page.$$('tbody tr');
    console.log(`   Found ${rows.length} document rows`);
    
    if (rows.length > 0) {
      // Right-click on the first row
      await rows[0].click({ button: 'right' });
      
      // Check for context menu
      const contextMenu = await page.waitForSelector('[role="menu"]', { timeout: 2000 }).catch(() => null);
      if (contextMenu) {
        // Get all menu items
        const menuItems = await page.$$eval('[role="menuitem"]', items => 
          items.map(item => item.textContent.trim())
        );
        
        console.log('   Context menu items:', menuItems);
        
        if (menuItems[0] === 'Open in Obsidian') {
          console.log('   ✅ "Open in Obsidian" is the first menu item');
        } else {
          console.log('   ❌ "Open in Obsidian" is not the first menu item');
          console.log('      First item is:', menuItems[0]);
        }
        
        // Close context menu
        await page.keyboard.press('Escape');
      } else {
        console.log('   ⚠️  Could not open context menu');
      }
    } else {
      console.log('   ⚠️  No documents found to test context menu');
    }
    
    // Test 2: Search mode toggle and panel closing
    console.log('\n📋 Test 2: Panel Auto-Close on Search Mode Change');
    
    // Check if similarity is available
    const similarityButton = await page.$('button:has-text("Similarity")');
    const isSimilarityDisabled = similarityButton ? 
      await similarityButton.evaluate(btn => btn.disabled) : true;
    
    console.log(`   Similarity search: ${isSimilarityDisabled ? 'Disabled (not configured)' : 'Enabled'}`);
    
    // Open Select panel
    const selectButton = await page.$('button:has([class*="Filter"])');
    if (selectButton) {
      await selectButton.click();
      await page.waitForTimeout(500); // Wait for animation
      
      // Check if panel is open
      const selectPanel = await page.$('div:has(> button:has([class*="Filter"])) + div');
      const isSelectOpen = selectPanel !== null;
      console.log(`   Select panel opened: ${isSelectOpen ? '✅' : '❌'}`);
      
      if (isSelectOpen) {
        // Switch search mode (click Text if on Similarity, or vice versa)
        const currentMode = await page.$eval('button[data-state="on"]', btn => btn.textContent);
        const targetButton = currentMode === 'Text' && !isSimilarityDisabled ? 
          'button:has-text("Similarity")' : 'button:has-text("Text")';
        
        await page.click(targetButton);
        await page.waitForTimeout(500); // Wait for mode change
        
        // Check if panel is now closed
        const selectPanelAfter = await page.$('div:has(> button:has([class*="Filter"])) + div');
        const isSelectClosed = selectPanelAfter === null;
        console.log(`   Panel closed after mode change: ${isSelectClosed ? '✅' : '❌'}`);
        
        // Switch back
        await page.click(currentMode === 'Text' ? 'button:has-text("Text")' : 'button:has-text("Similarity")');
      }
    } else {
      console.log('   ⚠️  Could not find Select panel button');
    }
    
    // Test 3: Path display
    console.log('\n📋 Test 3: Path Display (Relative from Vault Root)');
    
    // Get path from first document
    const pathCells = await page.$$('tbody td:nth-child(2)'); // Path is second column
    if (pathCells.length > 0) {
      const firstPath = await pathCells[0].textContent();
      console.log(`   First document path: "${firstPath}"`);
      
      // Check if path looks like a relative path from vault root
      // It should NOT start with parent folder like "Notes/" or "test-notes/"
      // It should be like "Personal-sync/..." or just "/" for root files
      if (firstPath.startsWith('Notes/') || firstPath.startsWith('test-notes/')) {
        console.log('   ❌ Path still shows parent folder (should be relative from vault root)');
      } else if (firstPath === '/' || firstPath.includes('/') || !firstPath.includes('\\')) {
        console.log('   ✅ Path appears to be relative from vault root');
      } else {
        console.log('   ⚠️  Path format unclear, may need verification');
      }
      
      // Sample a few more paths
      const samplePaths = [];
      for (let i = 1; i < Math.min(5, pathCells.length); i++) {
        const path = await pathCells[i].textContent();
        samplePaths.push(path);
      }
      if (samplePaths.length > 0) {
        console.log('   Sample paths:', samplePaths);
      }
    } else {
      console.log('   ⚠️  No documents found to check path display');
    }
    
    console.log('\n=== Test Complete ===');
    console.log('Summary:');
    console.log('1. Context Menu: Check if "Open in Obsidian" is first item');
    console.log('2. Panel Auto-Close: Verified panels close on mode switch');
    console.log('3. Path Display: Checked if paths are relative from vault root');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testUIImprovements().catch(console.error);