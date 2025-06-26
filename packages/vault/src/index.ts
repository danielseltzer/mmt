/**
 * @fileoverview Vault loading and monitoring for MMT markdown management
 */

export { loadVault, createVaultContext } from './vault-operations.js';
export { FileWatcher } from './file-watcher/index.js';
export type { 
  FileChangeEvent, 
  FileChangeType, 
  FileWatcherOptions, 
  FileChangeListener 
} from './file-watcher/index.js';

// Re-export types from entities that are part of the public API
export type {
  Vault,
  VaultContext,
  Document,
  DocumentSet,
  Query,
  ExecutionResult,
  Operation,
} from '@mmt/entities';