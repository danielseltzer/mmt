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
    } else {
      // Check for stack traces in console logs (they often come as 'log' type)
      if (text.includes('Error') && text.includes('    at ')) {
        errors.push({ 
          text: 'Stack trace detected in console: ' + text.substring(0, 200), 
          isStackTrace: true 
        });
      }
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
      // Only look for actual error boundary elements, not data attributes
      const errorElement = document.querySelector('.error-boundary') || 
                          document.querySelector('.react-error') ||
                          (document.body.textContent?.includes('Something went wrong') && 
                           document.body.textContent?.includes('Error boundary'));
      return errorElement ? true : false;
    });
    
    if (reactError) {
      errors.push({ text: 'React error boundary triggered', isReactError: true });
    }
    
    // Check status bar for app state
    const appStatus = await page.evaluate(() => {
      const statusBar = document.getElementById('app-status-bar');
      const statusText = document.getElementById('status-text');
      const notificationText = document.getElementById('notification-text');
      
      // Check for the specific "Loading documents..." text that indicates stuck state
      const hasLoadingDocumentsText = document.body.textContent?.includes('Loading documents...') || false;
      
      return {
        statusBarExists: !!statusBar,
        status: statusBar?.dataset?.status || 'unknown',
        ready: statusBar?.dataset?.ready === 'true',
        hasError: statusBar?.dataset?.error === 'true',
        statusText: statusText?.textContent || '',
        notification: notificationText?.textContent || null,
        notificationType: statusBar?.querySelector('[data-notification-type]')?.dataset?.notificationType || null,
        
        // Check for various loading indicators
        hasLoadingText: document.body.textContent?.includes('Loading...') || false,
        hasLoadingDocumentsText: hasLoadingDocumentsText,
        
        // Additional checks
        documentCount: document.getElementById('document-count')?.textContent || '0',
        vaultCount: document.getElementById('vault-count')?.textContent || '0'
      };
    });
    
    // Check if app is stuck in loading or error state
    // The app should NOT show "Loading documents..." for more than a few seconds
    if (appStatus.hasLoadingDocumentsText) {
      // Wait a bit longer to see if it resolves
      await page.waitForTimeout(2000);
      
      // Check again
      const stillLoading = await page.evaluate(() => 
        document.body.textContent?.includes('Loading documents...')
      );
      
      if (stillLoading) {
        errors.push({ 
          text: 'App is stuck showing "Loading documents..." - documents are not loading properly',
          isLoadingError: true,
          critical: true
        });
      }
    }
    
    // Check status bar state
    if (appStatus.statusBarExists) {
      if (!appStatus.ready && appStatus.status !== 'initializing') {
        if (appStatus.status === 'loading-documents' || appStatus.status === 'loading-vaults') {
          // Check if it's been loading for too long
          errors.push({ 
            text: `App stuck in loading state: ${appStatus.statusText}`,
            isLoadingError: true,
            status: appStatus.status
          });
        } else if (appStatus.hasError || appStatus.status === 'error' || appStatus.status === 'timeout') {
          errors.push({ 
            text: `App in error state: ${appStatus.statusText}${appStatus.notification ? ' - ' + appStatus.notification : ''}`,
            isAppError: true,
            status: appStatus.status
          });
        } else if (appStatus.status === 'no-vaults') {
          errors.push({ 
            text: 'No vaults configured or found',
            isConfigError: true,
            status: appStatus.status
          });
        }
      }
    } else {
      // No status bar found but page loaded
      if (appStatus.hasLoadingText || appStatus.hasLoadingDocumentsText) {
        errors.push({ 
          text: 'Page shows loading text but no status bar found - app may be broken',
          isLoadingError: true
        });
      }
    }
    
    // Get page title to verify basic loading
    const title = await page.title();
    
    const result = {
      success: errors.length === 0,
      url,
      title,
      appMounted: appExists,
      appStatus,
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
      
      if (result.appStatus) {
        console.log(`\nApp Status: ${result.appStatus.statusText || result.appStatus.status}`);
        console.log(`Ready: ${result.appStatus.ready ? '✅ Yes' : '❌ No'}`);
        if (result.appStatus.documentCount !== '0') {
          console.log(`Documents: ${result.appStatus.documentCount}`);
        }
        if (result.appStatus.vaultCount !== '0') {
          console.log(`Vaults: ${result.appStatus.vaultCount}`);
        }
        if (result.appStatus.notification) {
          console.log(`Notification: [${result.appStatus.notificationType}] ${result.appStatus.notification}`);
        }
      }
      
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