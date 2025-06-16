/**
 * @mmt/indexer - High-performance markdown vault indexing
 * 
 * Provides fast, in-memory indexing of markdown vaults with
 * Dataview-inspired query capabilities.
 */

export { VaultIndexer } from './vault-indexer.js';
export type { 
  IndexerOptions,
  PageMetadata,
  Query,
  QueryCondition,
  LinkEntry,
  Heading,
} from './types.js';