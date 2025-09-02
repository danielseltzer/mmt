import { test, expect } from '@playwright/test';

/**
 * E2E test for Preview context menu option - Issue #150
 * 
 * Tests that the new Preview option:
 * 1. Appears as the first option in right-click context menu
 * 2. Opens the preview modal when clicked
 * 3. Makes the correct API call to fetch document preview
 * 4. Displays document content in the modal
 */

test.describe('Preview Context Menu', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the MMT application
    await page.goto('http://localhost:5173');
    
    // Wait for the application to load and display documents
    await expect(page.locator('[data-testid="name-cell"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('Preview context menu option appears and functions correctly', async ({ page }) => {
    // Find the first document row
    const firstRow = page.locator('[data-testid^="row-"]').first();
    await expect(firstRow).toBeVisible();

    // Right-click on the first row to open context menu
    await firstRow.click({ button: 'right' });

    // Check that context menu appears
    const contextMenu = page.locator('.fixed.bg-background.border.rounded-md.shadow-lg');
    await expect(contextMenu).toBeVisible();

    // Verify Preview is the first option in the menu
    const menuItems = contextMenu.locator('button');
    const firstMenuItem = menuItems.first();
    await expect(firstMenuItem).toHaveText('Preview');
    
    // Verify the context menu has multiple options including Preview
    await expect(contextMenu.locator('button').filter({ hasText: /^Preview$/ })).toBeVisible();

    // Set up API intercept to verify the preview API call
    await page.route('**/api/vaults/*/documents/preview/**', async route => {
      // Mock a successful preview response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          path: '/test-document.md',
          fullPath: '/path/to/test-document.md',
          preview: 'This is a test document content preview...',
          metadata: {
            title: 'Test Document',
            size: 1024,
            mtime: '2025-09-02T11:26:00.000Z',
            tags: ['test', 'preview'],
            frontmatter: {
              title: 'Test Document',
              tags: ['test', 'preview']
            }
          },
          hasMore: true
        })
      });
    });

    // Click on the specific Preview option (not Preview (QuickLook))
    const previewButton = contextMenu.locator('button').filter({ hasText: /^Preview$/ });
    await previewButton.click();

    // Verify context menu disappears
    await expect(contextMenu).not.toBeVisible();

    // Verify preview modal opens
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).toBeVisible();

    // Check modal header
    await expect(modal.locator('h2')).toHaveText('Document Preview');

    // Verify modal content loads (should show loading state first)
    const loadingSpinner = modal.locator('[data-testid="loading-spinner"], .animate-spin');
    
    // Wait for content to load and check preview content appears
    await expect(modal.locator('pre')).toBeVisible({ timeout: 5000 });
    
    // Verify the mocked content appears
    await expect(modal.locator('pre')).toContainText('This is a test document content preview');

    // Verify metadata is displayed
    await expect(modal).toContainText('Test Document');
    await expect(modal).toContainText('1.0 KB');

    // Close modal by clicking close button
    const closeButton = modal.locator('button').filter({ hasText: /Close|×/ }).first();
    await closeButton.click();

    // Verify modal closes
    await expect(modal).not.toBeVisible();
  });

  test('Preview context menu works for different documents', async ({ page }) => {
    // Find all document rows
    const rows = page.locator('[data-testid^="row-"]');
    const rowCount = await rows.count();
    
    if (rowCount > 1) {
      // Test with the second row if available
      const secondRow = rows.nth(1);
      await expect(secondRow).toBeVisible();

      // Right-click on the second row
      await secondRow.click({ button: 'right' });

      // Verify context menu appears with Preview option
      const contextMenu = page.locator('.fixed.bg-background.border.rounded-md.shadow-lg');
      await expect(contextMenu).toBeVisible();
      
      const previewOption = contextMenu.locator('button').filter({ hasText: /^Preview$/ });
      await expect(previewOption).toBeVisible();

      // Click elsewhere to close context menu for cleanup
      await page.click('body', { position: { x: 10, y: 10 } });
      await expect(contextMenu).not.toBeVisible();
    }
  });

  test('Preview modal can be closed by clicking backdrop', async ({ page }) => {
    // Right-click first row and open preview
    const firstRow = page.locator('[data-testid^="row-"]').first();
    await firstRow.click({ button: 'right' });
    
    const contextMenu = page.locator('.fixed.bg-background.border.rounded-md.shadow-lg');
    const previewOption = contextMenu.locator('button').filter({ hasText: /^Preview$/ });
    
    // Mock API response
    await page.route('**/api/vaults/*/documents/preview/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          path: '/test.md',
          fullPath: '/path/to/test.md',
          preview: 'Test content',
          metadata: {},
          hasMore: false
        })
      });
    });
    
    await previewOption.click();
    
    // Wait for modal to open
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).toBeVisible();
    
    // Click on backdrop to close
    const backdrop = modal.locator('.absolute.inset-0.bg-black\\/50');
    await backdrop.click({ position: { x: 10, y: 10 } });
    
    // Verify modal closes
    await expect(modal).not.toBeVisible();
  });

  test('Error handling in preview modal', async ({ page }) => {
    // Right-click first row
    const firstRow = page.locator('[data-testid^="row-"]').first();
    await firstRow.click({ button: 'right' });
    
    const contextMenu = page.locator('.fixed.bg-background.border.rounded-md.shadow-lg');
    const previewOption = contextMenu.locator('button').filter({ hasText: /^Preview$/ });
    
    // Mock API error response
    await page.route('**/api/vaults/*/documents/preview/**', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Document not found' })
      });
    });
    
    await previewOption.click();
    
    // Wait for modal to open
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).toBeVisible();
    
    // Check that error message appears
    await expect(modal.locator('.text-destructive')).toBeVisible();
    await expect(modal).toContainText('Failed to fetch preview');
  });
});