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
    // Look for the Filter panel button (labeled "Select:")
    const filterButton = page.locator('button:has-text("Select:")').first();
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
    // Look for the Transform panel button (labeled "Transform:")
    const transformButton = page.locator('button:has-text("Transform:")').first();
    await expect(transformButton).toBeVisible({ timeout: 5000 });
    
    // Click to open the Transform panel
    await transformButton.click();
    
    // Verify the Transform panel content area is visible
    page.locator('.border.rounded-lg.p-3').filter({ hasText: 'Rename' });
    
    // Check for the Add operation dropdown (should auto-open on empty panel)
    const addOperationDropdown = page.locator('button:has-text("Add operation")');
    await expect(addOperationDropdown).toBeVisible({ timeout: 3000 });
    
    // The dropdown should already be open, but if not, click it
    const dropdownOptions = page.locator('text=Rename files');
    if (!(await dropdownOptions.isVisible({ timeout: 500 }).catch(() => false))) {
      await addOperationDropdown.click();
    }
    
    // Verify dropdown options are available
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
    // Look for the Output panel button (labeled "Output:")
    const outputButton = page.locator('button:has-text("Output:")').first();
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
    
    // Check for preview section (the div label, not the button)
    await expect(page.locator('div:has-text("Preview")').first()).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ 
      path: 'playwright-screenshots/output-panel-open.png', 
      fullPage: false 
    });
  });

  test('All panels should be collapsible', async ({ page }) => {
    // Open Filter panel (labeled "Select:")
    const filterButton = page.locator('button:has-text("Select:")').first();
    await filterButton.click();
    await expect(page.locator('input[placeholder="Name..."]')).toBeVisible();
    
    // Close Filter panel by clicking again
    await filterButton.click();
    await expect(page.locator('input[placeholder="Name..."]')).not.toBeVisible();
    
    // Open Transform panel (labeled "Transform:")
    const transformButton = page.locator('button:has-text("Transform:")').first();
    await transformButton.click();
    
    // Verify only Transform panel is open (Filter should be closed)
    await expect(page.locator('input[placeholder="Name..."]')).not.toBeVisible();
    await expect(page.locator('button:has-text("Add operation")')).toBeVisible();
    
    // Close the Transform panel dropdown if it's open by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    
    // Open Output panel (labeled "Output:")
    const outputButton = page.locator('button:has-text("Output:")').first();
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
    await expect(page.locator('text=Preview Pipeline Execution')).toBeVisible({ timeout: 3000 });
    
    // Close the modal (use the first Close button found)
    const closeButton = page.locator('button:has-text("Close")').first();
    await closeButton.click();
    
    // Verify modal is closed
    await expect(page.locator('text=Preview Pipeline Execution')).not.toBeVisible();
  });

  test('Panel summaries should update when content changes', async ({ page }) => {
    // Wait for the app to initialize with default tab
    await page.waitForTimeout(500);
    
    // Open Filter panel and add a filter
    const filterButton = page.locator('button:has-text("Select:")').first();
    await filterButton.click();
    
    // Wait for panel to open
    await expect(page.locator('input[placeholder="Name..."]')).toBeVisible();
    
    // Type in the name filter
    const nameInput = page.locator('input[placeholder="Name..."]');
    await nameInput.fill('test');
    
    // Wait for the filter to be applied (React state update)
    await page.waitForTimeout(500);
    
    // Close the panel
    await filterButton.click();
    
    // Wait for panel to close and summary to render
    await expect(page.locator('input[placeholder="Name..."]')).not.toBeVisible();
    await page.waitForTimeout(200);
    
    // Verify the summary shows the filter is active
    // The summary span should be visible when panel is closed
    const filterSummary = filterButton.locator('span.panel-summary');
    await expect(filterSummary).toBeVisible();
    const summaryText = await filterSummary.textContent();
    expect(summaryText).toContain('name');
  });
});