#!/usr/bin/env node

import { chromium } from 'playwright';

const checkBrowserHealth = async (url = 'http://localhost:5173', options = {}) => {
  const { timeout = 10000, waitTime = 3000, verbose = false } = options;
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  const warnings = [];
  const logs = [];
  
  // Collect console messages
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    
    if (type === 'error') {
      const location = msg.location();
      // Report ALL errors - no filtering
      // The only exception is the React DevTools suggestion which is not an actual error
      const isDevToolsSuggestion = text.includes('React DevTools');
      
      if (!isDevToolsSuggestion) {
        errors.push({ text, location });
      }
    } else if (type === 'warning') {
      warnings.push(text);
    }
    
    if (verbose) {
      logs.push({ type, text });
    }
  });
  
  // Collect page errors
  page.on('pageerror', error => {
    errors.push({ text: error.message, isPageError: true });
  });
  
  // Collect failed requests
  page.on('requestfailed', request => {
    if (!request.url().includes('favicon')) {
      errors.push({ 
        text: `Request failed: ${request.url()} - ${request.failure()?.errorText}`,
        isNetworkError: true 
      });
    }
  });
  
  try {
    if (verbose) console.log(`Checking browser health at ${url}...`);
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout 
    });
    
    // Wait for React to mount and any delayed errors
    await page.waitForTimeout(waitTime);
    
    // Check if the app root exists
    const appExists = await page.evaluate(() => !!document.querySelector('#root'));
    
    // Check for React error boundaries
    const reactError = await page.evaluate(() => {
      const errorElement = document.querySelector('.error-boundary') || 
                          document.querySelector('[data-error]') ||
                          document.body.textContent?.includes('Something went wrong');
      return errorElement ? true : false;
    });
    
    if (reactError) {
      errors.push({ text: 'React error boundary triggered', isReactError: true });
    }
    
    // Get page title to verify basic loading
    const title = await page.title();
    
    const result = {
      success: errors.length === 0,
      url,
      title,
      appMounted: appExists,
      errors,
      warnings,
      timestamp: new Date().toISOString()
    };
    
    if (verbose) {
      result.logs = logs;
    }
    
    await browser.close();
    return result;
    
  } catch (error) {
    await browser.close();
    return {
      success: false,
      url,
      errors: [{ text: error.message, isFatalError: true }],
      warnings,
      timestamp: new Date().toISOString()
    };
  }
};

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const url = args[0] || 'http://localhost:5173';
  const verbose = args.includes('--verbose') || args.includes('-v');
  
  checkBrowserHealth(url, { verbose })
    .then(result => {
      console.log('\n=== Browser Health Check ===');
      console.log(`URL: ${result.url}`);
      console.log(`Status: ${result.success ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
      console.log(`Page Title: ${result.title || 'N/A'}`);
      console.log(`App Mounted: ${result.appMounted ? 'Yes' : 'No'}`);
      
      if (result.errors.length > 0) {
        console.log('\n❌ Errors Found:');
        result.errors.forEach((error, i) => {
          console.log(`  ${i + 1}. ${error.text}`);
          if (error.location?.url) {
            console.log(`     at ${error.location.url}:${error.location.lineNumber}`);
          }
        });
      }
      
      if (result.warnings.length > 0 && verbose) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach((warning, i) => {
          console.log(`  ${i + 1}. ${warning}`);
        });
      }
      
      if (verbose && result.logs) {
        console.log('\n📝 All Console Logs:');
        result.logs.forEach(log => {
          console.log(`  [${log.type}] ${log.text}`);
        });
      }
      
      console.log('\n' + '='.repeat(30));
      
      // Exit with error code if unhealthy
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Health check failed:', error);
      process.exit(1);
    });
}

export default checkBrowserHealth;