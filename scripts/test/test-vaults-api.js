#!/usr/bin/env node

import express from 'express';
import { ConfigService } from '@mmt/config';
import { vaultRegistry } from '@mmt/vault';

const app = express();

// Test route that mimics the vaults route
app.get('/test-vaults', async (req, res) => {
  console.log('Getting vault IDs...');
  const vaultIds = vaultRegistry.getVaultIds();
  console.log('Vault IDs:', vaultIds);
  
  console.log('Building vault data...');
  const vaults = vaultIds.map((vaultId) => {
    console.log(`Processing vault: ${vaultId}`);
    try {
      const vault = vaultRegistry.getVault(vaultId);
      if (!vault) {
        return {
          id: vaultId,
          status: 'error',
          error: 'Vault not found in registry'
        };
      }

      // Try to access properties
      console.log(`  - Status: ${vault.status}`);
      console.log(`  - Config name: ${vault.config.name}`);
      
      const vaultData = {
        id: vaultId,
        name: vault.config.name || vaultId,
        status: vault.status,
        ...(vault.error && { error: vault.error.message })
      };
      
      console.log(`  - Built data:`, JSON.stringify(vaultData));
      return vaultData;
    } catch (err) {
      console.error(`Error processing vault ${vaultId}:`, err);
      return {
        id: vaultId,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  });

  console.log('Sending response...');
  res.json({
    vaults,
    total: vaults.length,
    ready: vaults.filter((v) => v.status === 'ready').length
  });
  console.log('Response sent!');
});

async function start() {
  const configPath = '/Users/danielseltzer/code/mmt/config/daniel-vaults.yaml';
  console.log('Loading config...');
  
  const configService = new ConfigService();
  const config = configService.load(configPath);
  
  console.log('Initializing vaults...');
  await vaultRegistry.initializeVaults(config);
  
  console.log('Starting server...');
  app.listen(3002, () => {
    console.log('Test server running on http://localhost:3002');
    console.log('Try: curl http://localhost:3002/test-vaults');
  });
}

start().catch(console.error);