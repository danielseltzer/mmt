export { Vault } from './vault.js';
export { VaultRegistry, vaultRegistry } from './registry.js';
export type { 
  Vault as IVault,
  VaultStatus, 
  VaultServices 
} from './types.js';

// Re-export singleton convenience access
export { vaultRegistry as registry } from './registry.js';