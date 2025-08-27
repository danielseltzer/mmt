import type { VaultConfig } from '@mmt/entities';
import type { VaultIndexer } from '@mmt/indexer';

export type VaultStatus = 'initializing' | 'ready' | 'error';

export interface VaultServices {
  indexer: VaultIndexer;
  // watcher is exposed from indexer
  similaritySearch?: any; // Will be SimilaritySearchService once imported
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