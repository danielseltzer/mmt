import { test, expect } from '@playwright/test';

test('debug search functionality', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log('Browser log:', msg.text());
    }
  });
  
  // Monitor network requests
  page.on('request', request => {
    if (request.url().includes('api/documents')) {
      console.log('🌐 API Request:', request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('api/documents')) {
      console.log('📥 API Response:', response.status(), response.url());
    }
  });
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Get initial document count
  const initialCount = await page.getByText(/\d+ documents?/).textContent();
  console.log('\n📊 Initial count:', initialCount);
  
  // Type in search
  const searchInput = page.getByPlaceholder('Search documents...');
  await searchInput.fill('alpha');
  console.log('\n🔍 Typed "alpha" in search box');
  
  // Wait for debounce
  await page.waitForTimeout(1000);
  
  // Check if document count changed
  const afterSearchCount = await page.getByText(/\d+ documents?/).textContent();
  console.log('📊 After search count:', afterSearchCount);
  
  // Check what's visible in the table
  const visibleRows = await page.locator('tbody tr').count();
  console.log('📋 Visible table rows:', visibleRows);
  
  // Get the first few document names
  const docNames = await page.locator('[data-testid="name-cell"]').allTextContents();
  console.log('📄 Document names:', docNames.slice(0, 5));
});