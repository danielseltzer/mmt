import { test, expect } from '@playwright/test';

test.describe('Preview Modal Content - TDD', () => {
  test('Preview modal should display actual document content from API', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for tabs to load
    await page.waitForSelector('[data-testid^="tab-trigger-"]', { timeout: 15000 });
    
    // Click on the first tab
    const firstTab = page.locator('[data-testid^="tab-trigger-"]').first();
    await firstTab.click();
    
    // Wait for table rows to load
    await page.waitForSelector('[data-testid^="row-"]', { timeout: 15000 });
    
    // Get the first document's path from the table
    const firstRow = page.locator('[data-testid^="row-"]').first();
    const documentNameCell = firstRow.locator('[data-testid="name-cell"]').first();
    const documentName = await documentNameCell.textContent();
    console.log('First document name:', documentName);
    
    // Get the vault ID from the first tab (since we clicked it)
    const tabTestId = await firstTab.getAttribute('data-testid');
    const vaultId = tabTestId?.replace('tab-trigger-', '') || '';
    console.log('Vault ID:', vaultId);
    
    // Call the API directly to get expected content
    const apiResponse = await page.request.get(
      `http://localhost:3001/api/vaults/${vaultId}/documents/preview/${encodeURIComponent(documentName || '')}`
    );
    
    // Verify API responds successfully
    expect(apiResponse.ok()).toBeTruthy();
    const apiData = await apiResponse.json();
    console.log('API Preview data:', {
      path: apiData.path,
      hasContent: !!apiData.preview,
      contentLength: apiData.preview?.length,
      firstLine: apiData.preview?.split('\n')[0]
    });
    
    // Now open the Preview modal
    await firstRow.click({ button: 'right' });
    
    // Click Preview option
    const contextMenu = page.locator('.fixed.bg-background');
    await contextMenu.locator('button').first().click();
    
    // Wait for modal to open
    const modal = page.locator('h2:has-text("Document Preview")');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // CRITICAL TEST: Verify the modal shows the actual content
    // Wait for content to load and check it matches API response
    const previewContent = page.locator('pre');
    
    // The modal should show the preview content from the API
    if (apiData.preview) {
      // Wait for the pre element to have content
      await expect(previewContent).toBeVisible({ timeout: 10000 });
      const modalContent = await previewContent.textContent();
      
      console.log('Modal content:', {
        hasContent: !!modalContent,
        contentLength: modalContent?.length,
        firstLine: modalContent?.split('\n')[0]
      });
      
      // The modal content should match the API preview
      expect(modalContent).toBeTruthy();
      expect(modalContent?.trim()).toBe(apiData.preview.trim());
      
      console.log('✅ Preview modal shows correct content from API');
    } else {
      // If API returns no preview, modal should show appropriate message
      const emptyMessage = page.locator('text=/No preview available|Empty document/i');
      await expect(emptyMessage).toBeVisible({ timeout: 5000 });
      console.log('✅ Preview modal correctly shows no content available');
    }
    
    // Also verify metadata is displayed if present
    if (apiData.metadata?.size) {
      const sizeText = page.locator('text=/Size:/');
      await expect(sizeText).toBeVisible();
      console.log('✅ Metadata (size) is displayed');
    }
    
    if (apiData.metadata?.mtime) {
      const modifiedText = page.locator('text=/Modified:/');
      await expect(modifiedText).toBeVisible();
      console.log('✅ Metadata (modified date) is displayed');
    }
  });
});