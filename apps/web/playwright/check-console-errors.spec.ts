import { test, expect } from '@playwright/test';

test('app loads without console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  
  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(msg.text());
    }
  });
  
  // Also capture uncaught exceptions
  page.on('pageerror', error => {
    consoleErrors.push(`Uncaught ${error.name}: ${error.message}`);
  });
  
  // Navigate to the app
  await page.goto('/');
  
  // Wait for the app to load (wait for the title - it's in a CardTitle, not h1)
  await expect(page.getByText('MMT - Markdown Management Toolkit')).toBeVisible();
  
  // Report what we found
  if (consoleErrors.length > 0) {
    console.log('\n❌ Console Errors Found:');
    consoleErrors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
  }
  
  if (consoleWarnings.length > 0) {
    console.log('\n⚠️  Console Warnings:');
    consoleWarnings.forEach((warning, i) => {
      console.log(`  ${i + 1}. ${warning}`);
    });
  }
  
  // The test should fail if there are any console errors
  expect(consoleErrors).toHaveLength(0);
  
  // Also verify key UI elements are visible (not a blank page)
  await expect(page.getByPlaceholder('Search documents...')).toBeVisible();
  await expect(page.getByText(/\d+ documents?/)).toBeVisible();
  
  console.log('\n✅ App loaded successfully with no console errors!');
});

test('captures runtime errors in document table', async ({ page }) => {
  const errors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.push(`${error.name}: ${error.message}\n${error.stack}`);
  });
  
  await page.goto('/');
  
  // The DocumentTable will try to fetch documents, which might fail
  // Wait a bit to ensure any async errors are captured
  await page.waitForTimeout(2000);
  
  // Check what's visible on the page
  const pageContent = await page.content();
  console.log('\n📄 Page state:');
  
  // Check if loading
  const loading = await page.locator('text=/Loading/i').count();
  if (loading > 0) {
    console.log('  - Shows loading state');
  }
  
  // Check if error
  const errorText = await page.locator('[class*="destructive"]').count();
  if (errorText > 0) {
    console.log('  - Shows error state');
    const errorContent = await page.locator('[class*="destructive"]').textContent();
    console.log(`    Error: ${errorContent}`);
  }
  
  // Check if documents shown
  const documentCount = await page.locator('text=/documents/i').count();
  if (documentCount > 0) {
    const count = await page.locator('text=/documents/i').textContent();
    console.log(`  - Shows: ${count}`);
  }
  
  // Report errors
  if (errors.length > 0) {
    console.log('\n❌ Runtime Errors:');
    errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
  }
  
  expect(errors).toHaveLength(0);
});