/**
 * @fileoverview Core operations for MMT - the domain-specific language for markdown operations
 */

export { loadVault, createVaultContext } from './vault.js';

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