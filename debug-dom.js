#!/usr/bin/env node

import { chromium } from 'playwright';

const debugDOM = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Collect all console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  console.log('Opening page...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Wait for React to fully render
  
  // Get comprehensive DOM analysis
  const analysis = await page.evaluate(() => {
    const root = document.querySelector('#root');
    
    // Helper to get element info
    const getElementInfo = (el) => {
      if (!el) return null;
      const styles = window.getComputedStyle(el);
      return {
        tagName: el.tagName,
        id: el.id,
        className: el.className,
        childCount: el.children.length,
        textContent: el.textContent?.substring(0, 100),
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        width: styles.width,
        height: styles.height
      };
    };
    
    // Get all visible elements
    const visibleElements = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const text = el.innerText?.trim();
        if (text) {
          visibleElements.push({
            tag: el.tagName,
            text: text.substring(0, 50),
            rect: { width: rect.width, height: rect.height }
          });
        }
      }
    });
    
    return {
      root: getElementInfo(root),
      rootHTML: root?.innerHTML?.substring(0, 1000) || 'No root',
      bodyClasses: document.body.className,
      allText: document.body.innerText || '(No text content)',
      visibleElements: visibleElements.slice(0, 10), // First 10 visible elements
      // Check for common React app structures
      hasReactApp: !!document.querySelector('[data-reactroot]'),
      hasApp: !!document.querySelector('.App, .app, [class*="app"]'),
      hasMain: !!document.querySelector('main'),
      hasHeader: !!document.querySelector('header'),
      // Check for loading states
      hasLoadingIndicator: !!document.querySelector('[class*="loading"], [class*="spinner"], .loader'),
      // Get any error messages
      errorElements: Array.from(document.querySelectorAll('[class*="error"]')).map(el => el.textContent?.substring(0, 100))
    };
  });
  
  console.log('\n=== DOM ANALYSIS ===\n');
  
  console.log('Root Element:');
  if (analysis.root) {
    console.log(`  Tag: ${analysis.root.tagName}`);
    console.log(`  ID: ${analysis.root.id}`);
    console.log(`  Classes: ${analysis.root.className || '(none)'}`);
    console.log(`  Children: ${analysis.root.childCount}`);
    console.log(`  Display: ${analysis.root.display}`);
    console.log(`  Visibility: ${analysis.root.visibility}`);
    console.log(`  Dimensions: ${analysis.root.width} x ${analysis.root.height}`);
    console.log(`  Text preview: ${analysis.root.textContent || '(empty)'}`);
  } else {
    console.log('  NOT FOUND!');
  }
  
  console.log('\nPage Structure:');
  console.log(`  Has React App: ${analysis.hasReactApp}`);
  console.log(`  Has App Component: ${analysis.hasApp}`);
  console.log(`  Has Main: ${analysis.hasMain}`);
  console.log(`  Has Header: ${analysis.hasHeader}`);
  console.log(`  Has Loading Indicator: ${analysis.hasLoadingIndicator}`);
  
  console.log('\nVisible Elements with Text:');
  if (analysis.visibleElements.length > 0) {
    analysis.visibleElements.forEach((el, i) => {
      console.log(`  ${i + 1}. <${el.tag}> "${el.text}" (${el.rect.width}x${el.rect.height})`);
    });
  } else {
    console.log('  NONE FOUND!');
  }
  
  console.log('\nAll Text Content:');
  console.log(analysis.allText ? `  "${analysis.allText.substring(0, 200)}..."` : '  (EMPTY)');
  
  if (analysis.errorElements.length > 0) {
    console.log('\nError Elements Found:');
    analysis.errorElements.forEach(err => console.log(`  - ${err}`));
  }
  
  console.log('\nRoot HTML (first 1000 chars):');
  console.log(analysis.rootHTML);
  
  console.log('\nConsole Messages:');
  if (consoleMessages.length > 0) {
    consoleMessages.forEach(msg => console.log(`  ${msg}`));
  } else {
    console.log('  (none)');
  }
  
  // Take a screenshot for visual debugging
  await page.screenshot({ path: 'debug-screenshot.png' });
  console.log('\nScreenshot saved to: debug-screenshot.png');
  
  await browser.close();
};

debugDOM().catch(console.error);