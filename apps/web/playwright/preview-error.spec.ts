import { test, expect } from '@playwright/test';

test.describe('Preview Error Reproduction', () => {
  test('should reproduce the "Failed to fetch" error with folder and date filters', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load
    await page.waitForSelector('.pipeline-builder', { timeout: 10000 });
    
    // Step 1: Add folder filter in SELECT panel
    await page.click('text=SELECT');
    await page.waitForSelector('.filter-row', { timeout: 5000 });
    
    // Add folder filter
    await page.click('button:has-text("Add Filter")');
    await page.selectOption('.filter-row:last-child select[name="field"]', 'folders');
    await page.selectOption('.filter-row:last-child select[name="operator"]', 'in');
    
    // Type a folder path
    await page.fill('.filter-row:last-child input[type="text"]', '/Users/danielseltzer/Notes/Personal-sync-250710/Daily Notes');
    
    // Step 2: Add modified date filter
    await page.click('button:has-text("Add Filter")');
    await page.selectOption('.filter-row:last-child select[name="field"]', 'modified');
    await page.selectOption('.filter-row:last-child select[name="operator"]', 'gt');
    
    // Set date to 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateString = sevenDaysAgo.toISOString().split('T')[0];
    await page.fill('.filter-row:last-child input[type="date"]', dateString);
    
    // Step 3: Click TRANSFORM panel and add updateFrontmatter operation
    await page.click('text=TRANSFORM');
    await page.waitForSelector('.operation-row', { timeout: 5000 });
    
    // Add operation
    await page.click('button:has-text("Add Operation")');
    await page.selectOption('.operation-row:last-child select[name="type"]', 'updateFrontmatter');
    
    // Add a new frontmatter field
    await page.click('.operation-row:last-child button:has-text("Add Field")');
    await page.fill('.operation-row:last-child input[placeholder="Field name"]:last-of-type', 'reviewed');
    await page.fill('.operation-row:last-child input[placeholder="Field value"]:last-of-type', 'true');
    
    // Step 4: Click Preview button
    console.log('About to click Preview button...');
    
    // Listen for network requests
    const requestPromise = page.waitForRequest(request => 
      request.url().includes('/api/pipelines/execute') && request.method() === 'POST'
    );
    
    // Also listen for the response
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/pipelines/execute')
    );
    
    await page.click('button:has-text("Preview")');
    
    // Capture the request
    const request = await requestPromise;
    const requestBody = request.postDataJSON();
    console.log('Request sent to API:', JSON.stringify(requestBody, null, 2));
    
    // Capture the response
    const response = await responsePromise;
    const responseStatus = response.status();
    const responseBody = await response.text();
    console.log('Response status:', responseStatus);
    console.log('Response body:', responseBody);
    
    // Check if error appears
    const errorElement = await page.waitForSelector('.error-message, [role="alert"], text=/Failed to fetch/', { 
      timeout: 5000 
    }).catch(() => null);
    
    if (errorElement) {
      const errorText = await errorElement.textContent();
      console.log('Error displayed:', errorText);
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'preview-error.png', fullPage: true });
    }
    
    // Also check browser console for errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
    // Assertions
    if (responseStatus === 400) {
      expect(responseStatus).toBe(200); // This will fail and show us the issue
    }
  });
});