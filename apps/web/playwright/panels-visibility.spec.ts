import { test, expect } from '@playwright/test';

test.describe('Pipeline Panels Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Start the dev server and navigate to app
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load (even if no vaults are configured)
    await page.waitForSelector('#root', { timeout: 10000 });
    
    // Check if there are any console errors (excluding expected API connection errors)
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('ERR_CONNECTION_REFUSED')) {
        console.error('Console error:', msg.text());
      }
    });
  });

  test('Filter panel should open and display controls', async ({ page }) => {
    // Look for the Filter panel button
    const filterButton = page.locator('button:has-text("Filter")').first();
    await expect(filterButton).toBeVisible({ timeout: 5000 });
    
    // Click to open the Filter panel
    await filterButton.click();
    
    // Verify the Filter panel content is visible
    await expect(page.locator('input[placeholder="Name..."]')).toBeVisible();
    await expect(page.locator('input[placeholder="Content..."]')).toBeVisible();
    await expect(page.locator('button:has-text("Folders")')).toBeVisible();
    
    // Verify date and size filter inputs
    await expect(page.locator('input[placeholder="< 7 days"]')).toBeVisible();
    await expect(page.locator('input[placeholder="over 1mb"]')).toBeVisible();
    
    // Take screenshot for visual verification
    await page.screenshot({ 
      path: 'playwright-screenshots/filter-panel-open.png', 
      fullPage: false 
    });
  });

  test('Transform panel should open and display operations', async ({ page }) => {
    // Look for the Transform panel button
    const transformButton = page.locator('button:has-text("Transform")').first();
    await expect(transformButton).toBeVisible({ timeout: 5000 });
    
    // Click to open the Transform panel
    await transformButton.click();
    
    // Verify the Transform panel content area is visible
    const transformContent = page.locator('.border.rounded-lg.p-3').filter({ hasText: 'Rename' });
    
    // Check for the Add operation dropdown (should auto-open on empty panel)
    const addOperationDropdown = page.locator('button:has-text("Add operation")');
    await expect(addOperationDropdown).toBeVisible({ timeout: 3000 });
    
    // Verify dropdown options are available
    await addOperationDropdown.click();
    await expect(page.locator('text=Rename files')).toBeVisible();
    await expect(page.locator('text=Move to folder')).toBeVisible();
    await expect(page.locator('text=Delete files')).toBeVisible();
    await expect(page.locator('text=Update frontmatter')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ 
      path: 'playwright-screenshots/transform-panel-open.png', 
      fullPage: false 
    });
  });

  test('Output panel should open and display format options', async ({ page }) => {
    // Look for the Output panel button
    const outputButton = page.locator('button:has-text("Output")').first();
    await expect(outputButton).toBeVisible({ timeout: 5000 });
    
    // Click to open the Output panel
    await outputButton.click();
    
    // Verify the Output panel content is visible
    await expect(page.locator('text=Output Format')).toBeVisible();
    
    // Check for format selector
    const formatSelector = page.locator('button[role="combobox"]').filter({ hasText: 'JSON' });
    await expect(formatSelector.or(page.locator('button:has-text("Select format")'))).toBeVisible();
    
    // Verify options section is visible
    await expect(page.locator('text=Options')).toBeVisible();
    
    // Check for preview section
    await expect(page.locator('text=Preview')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ 
      path: 'playwright-screenshots/output-panel-open.png', 
      fullPage: false 
    });
  });

  test('All panels should be collapsible', async ({ page }) => {
    // Open Filter panel
    const filterButton = page.locator('button:has-text("Filter")').first();
    await filterButton.click();
    await expect(page.locator('input[placeholder="Name..."]')).toBeVisible();
    
    // Close Filter panel by clicking again
    await filterButton.click();
    await expect(page.locator('input[placeholder="Name..."]')).not.toBeVisible();
    
    // Open Transform panel
    const transformButton = page.locator('button:has-text("Transform")').first();
    await transformButton.click();
    
    // Verify only Transform panel is open (Filter should be closed)
    await expect(page.locator('input[placeholder="Name..."]')).not.toBeVisible();
    await expect(page.locator('button:has-text("Add operation")')).toBeVisible();
    
    // Open Output panel
    const outputButton = page.locator('button:has-text("Output")').first();
    await outputButton.click();
    
    // Verify only Output panel is open (Transform should be closed)
    await expect(page.locator('button:has-text("Add operation")')).not.toBeVisible();
    await expect(page.locator('text=Output Format')).toBeVisible();
  });

  test('Preview button should be visible and clickable', async ({ page }) => {
    // Look for the Preview button
    const previewButton = page.locator('button:has-text("Preview")').first();
    await expect(previewButton).toBeVisible({ timeout: 5000 });
    
    // Click the Preview button
    await previewButton.click();
    
    // Verify the preview modal opens
    await expect(page.locator('text=Pipeline Preview')).toBeVisible({ timeout: 3000 });
    
    // Close the modal
    const closeButton = page.locator('button[aria-label="Close"]').or(page.locator('button:has-text("Close")'));
    await closeButton.click();
    
    // Verify modal is closed
    await expect(page.locator('text=Pipeline Preview')).not.toBeVisible();
  });

  test('Panel summaries should update when content changes', async ({ page }) => {
    // Open Filter panel and add a filter
    const filterButton = page.locator('button:has-text("Filter")').first();
    await filterButton.click();
    
    // Type in the name filter
    const nameInput = page.locator('input[placeholder="Name..."]');
    await nameInput.fill('test');
    
    // Close the panel
    await filterButton.click();
    
    // Verify the summary shows the filter is active
    // (The summary should show something other than "All")
    const filterSummary = page.locator('button:has-text("Filter")').locator('span.text-muted-foreground');
    const summaryText = await filterSummary.textContent();
    expect(summaryText).toContain('name');
  });
});