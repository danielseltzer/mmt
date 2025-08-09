import type { VaultConfig } from '@mmt/entities';
import type { VaultIndexer } from '@mmt/indexer';

export type VaultStatus = 'initializing' | 'ready' | 'error';

export interface VaultServices {
  indexer: VaultIndexer;
  // watcher will be exposed from indexer
  // similaritySearch will be added when that service is vault-aware
}

export interface Vault {
  id: string;
  config: VaultConfig;
  status: VaultStatus;
  services?: VaultServices;
  error?: Error;
  
  // Convenience accessors
  get indexer(): VaultIndexer;
}