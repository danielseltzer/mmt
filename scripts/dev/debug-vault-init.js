#!/usr/bin/env node

import { VaultRegistry } from '@mmt/vault';
import { ConfigService } from '@mmt/config';

console.log('Starting vault initialization debug...');

const configPath = '/Users/danielseltzer/code/mmt/config/personal-vault-qdrant.yaml';
console.log('Loading config from:', configPath);

try {
  const configService = new ConfigService();
  const config = configService.load(configPath);
  console.log('Config loaded:', JSON.stringify(config, null, 2));
  
  const registry = VaultRegistry.getInstance();
  console.log('Got registry instance');
  
  console.log('Starting vault initialization...');
  const timeout = setTimeout(() => {
    console.error('ERROR: Vault initialization timed out after 10 seconds!');
    console.error('This is likely an infinite loop or blocking operation.');
    process.exit(1);
  }, 10000);
  
  await registry.initializeVaults(config);
  clearTimeout(timeout);
  
  console.log('Vault initialization completed!');
  
  const vaultIds = registry.getVaultIds();
  console.log('Vault IDs:', vaultIds);
  
  process.exit(0);
} catch (error) {
  console.error('Error during initialization:', error);
  process.exit(1);
}