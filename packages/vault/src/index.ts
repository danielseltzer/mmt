export { Vault } from './vault.js';
export { VaultRegistry, vaultRegistry } from './registry.js';
export { SimilaritySearchService } from './similarity-search-service.js';
export type { 
  Vault as IVault,
  VaultStatus, 
  VaultServices 
} from './types.js';
export type {
  SimilaritySearchResult,
  IndexStatus,
  IndexingProgress,
  SimilarityStatus,
  IndexingResult
} from './similarity-search-service.js';

// Re-export singleton convenience access
export { vaultRegistry as registry } from './registry.js';