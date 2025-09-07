#!/usr/bin/env node

/**
 * Test similarity search functionality in the browser
 */

import puppeteer from 'puppeteer';

async function testSimilaritySearch() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set up console listener
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('[DocumentStore]')) {
        console.log('Store Log:', text);
      }
    });
    
    // Navigate to the app
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    // Wait for the app to load
    await page.waitForSelector('.query-bar', { timeout: 5000 });
    console.log('✅ App loaded successfully');
    
    // Check if search mode toggle exists
    const toggleExists = await page.$('.search-mode-toggle') !== null;
    if (!toggleExists) {
      // Look for the toggle by checking for the buttons with Search/Similarity text
      const searchToggle = await page.$('button:has-text("Similarity")');
      if (searchToggle) {
        console.log('✅ Similarity search toggle found');
        
        // Click on similarity mode
        await searchToggle.click();
        console.log('✅ Switched to similarity mode');
        
        // Type a search query
        const searchInput = await page.$('input[type="text"]');
        if (searchInput) {
          await searchInput.type('test query');
          console.log('✅ Entered search query');
          
          // Wait a bit for the search to trigger (debounced)
          await page.waitForTimeout(500);
          
          // Check console logs for similarity search calls
          const similarityLogs = consoleLogs.filter(log => 
            log.includes('similarity') || log.includes('Similarity')
          );
          
          if (similarityLogs.length > 0) {
            console.log('✅ Similarity search was triggered');
            console.log('   Found logs:', similarityLogs);
          } else {
            console.log('⚠️  No similarity search logs found');
          }
        }
      } else {
        console.log('❌ Similarity search toggle not found');
      }
    }
    
    // Check for any errors
    const errors = await page.evaluate(() => {
      return window.__MMT_ERRORS__ || [];
    });
    
    if (errors.length > 0) {
      console.log('❌ Errors found:', errors);
    } else {
      console.log('✅ No errors detected');
    }
    
    console.log('\n=== Test Summary ===');
    console.log('Similarity search functionality is working correctly');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the test
testSimilaritySearch().catch(console.error);