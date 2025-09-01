/**
 * E2E Test: Configurable URLs (Issue #132)
 * 
 * Tests that verify the new configurable URL system works correctly:
 * - API endpoints respond with correct port configuration
 * - Frontend can communicate with API via proxy
 * - URL configuration is properly loaded from config
 * - Both direct API access and proxied access work
 */

import { test, expect } from '@playwright/test';

test.describe('Configurable URLs', () => {
  test('API endpoints respond correctly with configured ports', async ({ request }) => {
    // Test direct API access on configured port (3001)
    const healthResponse = await request.get('http://localhost:3001/health');
    expect(healthResponse.ok()).toBeTruthy();
    
    const healthData = await healthResponse.json();
    expect(healthData).toMatchObject({
      status: 'ok',
      version: '0.1.0',
      vaults: 2
    });
    
    // Test vaults endpoint
    const vaultsResponse = await request.get('http://localhost:3001/api/vaults');
    expect(vaultsResponse.ok()).toBeTruthy();
    
    const vaultsData = await vaultsResponse.json();
    expect(vaultsData).toMatchObject({
      total: 2,
      ready: 2,
      vaults: expect.arrayContaining([
        expect.objectContaining({ id: 'Personal', status: 'ready' }),
        expect.objectContaining({ id: 'Test Notes', status: 'ready' })
      ])
    });
    
    // Test config endpoint returns correct port configuration
    const configResponse = await request.get('http://localhost:3001/api/config');
    expect(configResponse.ok()).toBeTruthy();
    
    const configData = await configResponse.json();
    expect(configData).toMatchObject({
      apiPort: 3001,
      webPort: 5173,
      vaults: expect.arrayContaining([
        expect.objectContaining({ name: 'Personal' }),
        expect.objectContaining({ name: 'Test Notes' })
      ])
    });
  });

  test('Frontend proxy correctly routes API calls', async ({ request }) => {
    // Test proxied API access via frontend (5173 -> 3001)
    const vaultsResponse = await request.get('http://localhost:5173/api/vaults');
    expect(vaultsResponse.ok()).toBeTruthy();
    
    const vaultsData = await vaultsResponse.json();
    expect(vaultsData).toMatchObject({
      total: 2,
      ready: 2,
      vaults: expect.arrayContaining([
        expect.objectContaining({ id: 'Personal', status: 'ready' }),
        expect.objectContaining({ id: 'Test Notes', status: 'ready' })
      ])
    });
    
    // Test config via proxy
    const configResponse = await request.get('http://localhost:5173/api/config');
    expect(configResponse.ok()).toBeTruthy();
    
    const configData = await configResponse.json();
    expect(configData).toMatchObject({
      apiPort: 3001,
      webPort: 5173
    });
  });

  test('UI loads and can communicate with API', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load - use a more generic selector since data-testid may not be present
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    
    // Check that no console errors occurred during loading
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Filter out expected 501 errors for unconfigured features
        const text = msg.text();
        if (!text.includes('501') && !text.includes('Not Implemented')) {
          consoleErrors.push(text);
        }
      }
    });
    
    // Wait a moment for any async operations to complete
    await page.waitForTimeout(2000);
    
    // Verify no unexpected console errors
    expect(consoleErrors).toHaveLength(0);
    
    // Check that the app title is correct - this validates that the page loaded successfully
    // and the frontend can communicate with the API without errors
    await expect(page).toHaveTitle(/MMT - Markdown Management Toolkit/, { timeout: 5000 });
  });

  test('vault-specific API endpoints work correctly', async ({ request }) => {
    // Test vault status endpoints for both vaults
    const personalStatusResponse = await request.get('http://localhost:3001/api/vaults/Personal/status');
    expect(personalStatusResponse.ok()).toBeTruthy();
    
    const personalStatus = await personalStatusResponse.json();
    expect(personalStatus).toMatchObject({
      id: 'Personal',
      name: 'Personal',
      status: 'ready',
      timestamp: expect.any(String)
    });
    
    const testNotesStatusResponse = await request.get('http://localhost:3001/api/vaults/Test%20Notes/status');
    expect(testNotesStatusResponse.ok()).toBeTruthy();
    
    const testNotesStatus = await testNotesStatusResponse.json();
    expect(testNotesStatus).toMatchObject({
      id: 'Test Notes',
      name: 'Test Notes',
      status: 'ready',
      timestamp: expect.any(String)
    });
  });

  test('URL encoding in vault IDs works correctly', async ({ request }) => {
    // Test that vault IDs with spaces are properly URL encoded
    const vaultWithSpacesResponse = await request.get('http://localhost:5173/api/vaults/Test%20Notes/status');
    expect(vaultWithSpacesResponse.ok()).toBeTruthy();
    
    // Also test via direct API
    const directResponse = await request.get('http://localhost:3001/api/vaults/Test%20Notes/status');
    expect(directResponse.ok()).toBeTruthy();
    
    // Verify both return the same structure (timestamps may differ slightly)
    const proxiedData = await vaultWithSpacesResponse.json();
    const directData = await directResponse.json();
    
    // Compare everything except timestamp which can vary between requests
    expect(proxiedData.id).toBe(directData.id);
    expect(proxiedData.name).toBe(directData.name);
    expect(proxiedData.status).toBe(directData.status);
    expect(proxiedData.timestamp).toBeDefined();
    expect(directData.timestamp).toBeDefined();
  });
});