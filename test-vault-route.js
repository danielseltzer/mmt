#!/usr/bin/env node

import { ConfigService } from '@mmt/config';
import { vaultRegistry } from '@mmt/vault';

async function testVaultRoute() {
  const configPath = '/Users/danielseltzer/code/mmt/personal-vault-similarity-config.yaml';
  console.log('Loading config...');
  
  const configService = new ConfigService();
  const config = configService.load(configPath);
  
  console.log('Initializing vaults...');
  await vaultRegistry.initializeVaults(config);
  
  console.log('\n=== Testing vault route logic ===\n');
  
  console.log('Step 1: Getting vault IDs...');
  const vaultIds = vaultRegistry.getVaultIds();
  console.log('  Got vault IDs:', vaultIds);
  
  console.log('\nStep 2: Mapping vaults...');
  const vaults = vaultIds.map((vaultId) => {
    console.log(`  Processing vault: ${vaultId}`);
    try {
      const vault = vaultRegistry.getVault(vaultId);
      if (!vault) {
        console.log('    - Vault not found!');
        return {
          id: vaultId,
          status: 'error',
          error: 'Vault not found in registry'
        };
      }

      console.log(`    - Status: ${vault.status}`);
      console.log(`    - Config name: ${vault.config.name}`);
      
      const result = {
        id: vaultId,
        name: vault.config.name || vaultId,
        status: vault.status,
        ...(vault.error && { error: vault.error.message })
      };
      
      console.log(`    - Result:`, JSON.stringify(result));
      return result;
    } catch (err) {
      console.error(`    - Error:`, err);
      return {
        id: vaultId,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  });
  
  console.log('\nStep 3: Building response...');
  const response = {
    vaults,
    total: vaults.length,
    ready: vaults.filter((v) => v.status === 'ready').length
  };
  
  console.log('\nStep 4: Converting to JSON...');
  try {
    const json = JSON.stringify(response, null, 2);
    console.log('SUCCESS! Response JSON:');
    console.log(json);
  } catch (err) {
    console.error('ERROR converting to JSON:', err);
  }
  
  console.log('\n=== Test complete ===');
}

testVaultRoute().catch(console.error);