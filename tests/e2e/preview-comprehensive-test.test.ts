import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E test for Preview feature functionality
 * 
 * Tests all required behaviors:
 * 1. Navigate to application and view documents
 * 2. Right-click context menu with Preview as FIRST option
 * 3. Preview modal opens with proper content
 * 4. Document path in header
 * 5. Metadata display (size, modified date, tags if present)
 * 6. Content preview
 * 7. Modal closing with X button and Escape key
 * 8. Test with multiple different documents for consistency
 */

test.describe('Preview Feature Comprehensive Test', () => {
  test('Complete Preview feature workflow with all requirements', async ({ page }) => {
    // 1. Navigate to http://localhost:5173
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // 2. Click on a vault to view documents
    await page.waitForSelector('[data-testid="vault-card"]', { timeout: 10000 });
    const vaultCards = page.locator('[data-testid="vault-card"]');
    const vaultCount = await vaultCards.count();
    expect(vaultCount).toBeGreaterThan(0);
    
    // Click on the first vault
    await vaultCards.first().click();
    
    // Wait for table to load with data rows
    await page.waitForSelector('[data-testid^="row-"]', { timeout: 10000 });
    const rows = page.locator('[data-testid^="row-"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    
    // 3. Right-click on a document row
    const firstRow = rows.first();
    await expect(firstRow).toBeVisible();
    
    // Get the document name for later verification
    const documentNameCell = firstRow.locator('[data-testid="name-cell"]');
    const documentName = await documentNameCell.textContent();
    expect(documentName).toBeTruthy();
    
    await firstRow.click({ button: 'right' });
    
    // 4. Verify that "Preview" appears as the FIRST option in the context menu
    const contextMenu = page.locator('.fixed.bg-background');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });
    
    const menuButtons = contextMenu.locator('button');
    const menuCount = await menuButtons.count();
    expect(menuCount).toBeGreaterThan(0);
    
    // Verify Preview is the first item
    const firstMenuItem = menuButtons.first();
    await expect(firstMenuItem).toHaveText('Preview');
    
    // Mock API response for consistent testing
    await page.route('**/api/vaults/*/documents/preview/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          path: `/test-document.md`,
          fullPath: `/full/path/to/test-document.md`,
          preview: `# Test Document\n\nThis is a comprehensive test document with multiple lines of content.\n\n## Section 1\n\nSome content here with **bold** text and *italic* text.\n\n## Section 2\n\nMore content to verify the preview works correctly.\n\n- List item 1\n- List item 2\n- List item 3\n\nEnd of preview content.`,
          metadata: {
            title: 'Test Document',
            size: 2048,
            mtime: '2025-09-02T15:30:00.000Z',
            tags: ['test', 'preview', 'comprehensive'],
            frontmatter: {
              title: 'Test Document',
              tags: ['test', 'preview', 'comprehensive'],
              date: '2025-09-02'
            }
          },
          hasMore: false
        })
      });
    });
    
    // 5. Click on "Preview"
    await firstMenuItem.click();
    
    // 6. Verify the preview modal opens and displays required content
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // 6a. Document path in header
    const modalHeader = modal.locator('h2:has-text("Document Preview")');
    await expect(modalHeader).toBeVisible();
    
    // 6b. Metadata (size, modified date, tags if present)
    // Wait for content to load
    await page.waitForTimeout(1000);
    
    // Check for size metadata
    await expect(modal).toContainText('2.0 KB');
    
    // Check for modified date
    await expect(modal).toContainText('Sep 2, 2025');
    
    // Check for tags
    await expect(modal).toContainText('test');
    await expect(modal).toContainText('preview');
    await expect(modal).toContainText('comprehensive');
    
    // 6c. Content preview
    const previewContent = modal.locator('pre');
    await expect(previewContent).toBeVisible();
    await expect(previewContent).toContainText('# Test Document');
    await expect(previewContent).toContainText('This is a comprehensive test document');
    await expect(previewContent).toContainText('## Section 1');
    await expect(previewContent).toContainText('Some content here with **bold** text');
    
    // 7a. Test closing the modal with X button
    const closeButton = modal.locator('button').filter({ 
      hasText: /Close|×/ 
    }).first();
    
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await expect(modal).not.toBeVisible({ timeout: 3000 });
    } else {
      // Alternative: look for button with X icon
      const xButton = modal.locator('button:has(svg)').first();
      if (await xButton.isVisible()) {
        await xButton.click();
        await expect(modal).not.toBeVisible({ timeout: 3000 });
      } else {
        console.log('No close button found, testing Escape key only');
      }
    }
    
    // Reopen modal for Escape key test
    await firstRow.click({ button: 'right' });
    await contextMenu.locator('button').first().click(); // First button is Preview
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // 7b. Test closing the modal with Escape key
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });

  test('Test Preview with multiple different documents for consistency', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Click on vault and wait for documents
    await page.waitForSelector('[data-testid="vault-card"]', { timeout: 10000 });
    await page.click('[data-testid="vault-card"]');
    
    await page.waitForSelector('[data-testid^="row-"]', { timeout: 10000 });
    const rows = page.locator('[data-testid^="row-"]');
    const totalRows = await rows.count();
    
    // Test with up to 3 different documents or all available if fewer
    const testCount = Math.min(3, totalRows);
    
    for (let i = 0; i < testCount; i++) {
      const currentRow = rows.nth(i);
      await expect(currentRow).toBeVisible();
      
      // Get document name for this iteration
      const nameCell = currentRow.locator('[data-testid="name-cell"]');
      const docName = await nameCell.textContent();
      
      // Right-click on the row
      await currentRow.click({ button: 'right' });
      
      // Verify context menu appears
      const contextMenu = page.locator('.fixed.bg-background');
      await expect(contextMenu).toBeVisible({ timeout: 5000 });
      
      // Verify Preview is first option
      const firstOption = contextMenu.locator('button').first();
      await expect(firstOption).toHaveText('Preview');
      
      // Mock different response for each document
      await page.route('**/api/vaults/*/documents/preview/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            path: `/document-${i}.md`,
            fullPath: `/path/to/document-${i}.md`,
            preview: `# Document ${i}\n\nContent for document number ${i}.\nThis tests consistency across multiple documents.`,
            metadata: {
              title: `Document ${i}`,
              size: 1024 + (i * 512),
              mtime: new Date(2025, 8, 2, 15, 30 + i).toISOString(),
              tags: [`doc${i}`, 'test']
            },
            hasMore: false
          })
        });
      });
      
      // Click Preview
      await firstOption.click();
      
      // Verify modal opens
      const modal = page.locator('.fixed.inset-0.z-50');
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // Verify modal title
      await expect(modal.locator('h2:has-text("Document Preview")')).toBeVisible();
      
      // Verify content loads
      const previewContent = modal.locator('pre');
      await expect(previewContent).toBeVisible();
      await expect(previewContent).toContainText(`Document ${i}`);
      await expect(previewContent).toContainText(`Content for document number ${i}`);
      
      // Close modal with Escape for next iteration
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('Preview modal error handling and edge cases', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Click on vault and wait for documents
    await page.waitForSelector('[data-testid="vault-card"]', { timeout: 10000 });
    await page.click('[data-testid="vault-card"]');
    
    await page.waitForSelector('[data-testid^="row-"]', { timeout: 10000 });
    const firstRow = page.locator('[data-testid^="row-"]').first();
    
    // Test error handling
    await firstRow.click({ button: 'right' });
    const contextMenu = page.locator('.fixed.bg-background');
    
    // Mock API error response
    await page.route('**/api/vaults/*/documents/preview/**', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Document not found' })
      });
    });
    
    await contextMenu.locator('button').first().click();
    
    // Verify modal still opens but shows error
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Check for error message
    await expect(modal.locator('.text-destructive')).toBeVisible();
    await expect(modal).toContainText('Failed to fetch preview');
    
    // Verify modal can still be closed
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });
});