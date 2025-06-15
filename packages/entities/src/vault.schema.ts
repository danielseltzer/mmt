/**
 * @fileoverview Vault and execution-related schemas.
 * 
 * This file defines schemas for vault state management, indexing structures,
 * operation execution results, and related data structures. The vault is the
 * central abstraction representing a collection of markdown documents.
 */

import { z } from 'zod';
import { DocumentSchema } from './document.schema.js';
import { OperationSchema } from './operation.schema.js';

/**
 * Vault indexing structures for efficient querying.
 * 
 * These indexes are derived from document content and metadata to enable
 * fast lookups without scanning all files. They're rebuilt when documents
 * change and cached for performance.
 */
export const VaultIndexSchema = z.object({
  /** Map from tag name to array of document paths containing that tag */
  byTag: z.map(z.string(), z.array(z.string())).describe('Tag to document paths'),
  
  /** Map from directory path to array of document paths in that directory */
  byPath: z.map(z.string(), z.array(z.string())).describe('Directory to document paths'),
  
  /** Map from document path to array of paths it links to */
  links: z.map(z.string(), z.array(z.string())).describe('Document to outgoing links'),
  
  /** Map from document path to array of paths that link to it */
  backlinks: z.map(z.string(), z.array(z.string())).describe('Document to incoming links'),
});

export type VaultIndex = z.infer<typeof VaultIndexSchema>;

/**
 * Complete vault state representation.
 * 
 * The vault contains all documents and derived indexes. It represents the
 * current state of the markdown collection and is the primary data structure
 * that operations work with.
 * 
 * @example
 * ```typescript
 * const vault: Vault = {
 *   basePath: '/Users/me/notes',
 *   documents: new Map([
 *     ['/Users/me/notes/example.md', { ... }]
 *   ]),
 *   index: {
 *     byTag: new Map([['project', ['/Users/me/notes/example.md']]]),
 *     byPath: new Map([['/Users/me/notes', ['/Users/me/notes/example.md']]]),
 *     links: new Map(),
 *     backlinks: new Map()
 *   }
 * };
 * ```
 */
export const VaultSchema = z.object({
  /** Absolute path to the vault root directory */
  basePath: z.string().describe('Root directory of vault'),
  
  /** Map from absolute path to document data */
  documents: z.map(z.string(), DocumentSchema).describe('Path to document map'),
  
  /** Derived indexes for efficient querying */
  index: VaultIndexSchema.describe('Derived search structures'),
});

export type Vault = z.infer<typeof VaultSchema>;

/**
 * Fluent API context for chaining operations.
 * 
 * This schema represents the state carried through a fluent API chain,
 * allowing operations to be built up and executed as a batch.
 */
export const VaultContextSchema = z.object({
  /** Current vault state */
  vault: VaultSchema.describe('Current vault state'),
  
  /** Currently selected documents (DocumentSetSchema will be available from index.ts) */
  selection: z.any().describe('Current document selection'),
  
  /** Operations queued for execution */
  pendingOperations: z.array(OperationSchema).describe('Operations to execute'),
});

export type VaultContext = z.infer<typeof VaultContextSchema>;

/**
 * Link update tracking for operation results.
 * 
 * When files are moved or renamed, links pointing to them must be updated.
 * This schema tracks each link update for reporting and potential rollback.
 */
export const LinkUpdateSchema = z.object({
  /** Path to the file containing the link */
  inFile: z.string().describe('File containing the link'),
  
  /** Original link target before update */
  oldTarget: z.string().describe('Original link target'),
  
  /** Updated link target after operation */
  newTarget: z.string().describe('Updated link target'),
});

export type LinkUpdate = z.infer<typeof LinkUpdateSchema>;

/**
 * Result of executing operations on a vault.
 * 
 * This comprehensive result object provides details about what changed,
 * what succeeded or failed, and the new vault state. It enables detailed
 * reporting and potential rollback operations.
 * 
 * @example Successful execution
 * ```typescript
 * const result: ExecutionResult = {
 *   success: true,
 *   vault: updatedVault,
 *   executed: [moveOp, updateOp],
 *   movedFiles: {
 *     '/old/path.md': '/new/path.md'
 *   },
 *   updatedLinks: [
 *     { inFile: '/other.md', oldTarget: 'old/path', newTarget: 'new/path' }
 *   ],
 *   modifiedFiles: ['/new/path.md', '/other.md']
 * };
 * ```
 */
export const ExecutionResultSchema = z.object({
  /** Whether all operations succeeded */
  success: z.boolean().describe('Whether execution succeeded'),
  
  /** Updated vault state if successful */
  vault: VaultSchema.optional().describe('New vault state if successful'),
  
  /** Error details if any operation failed */
  error: z.instanceof(Error).optional().describe('Error if failed'),
  
  /** Operations that were actually executed */
  executed: z.array(OperationSchema).describe('Operations that were executed'),
  
  /** Map from old paths to new paths for moved files */
  movedFiles: z.record(z.string(), z.string()).describe('Old path to new path mapping'),
  
  /** All links that were updated to maintain integrity */
  updatedLinks: z.array(LinkUpdateSchema).describe('Links that were updated'),
  
  /** All files that had any modifications */
  modifiedFiles: z.array(z.string()).describe('Files with metadata changes'),
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

/**
 * Snapshot metadata for operation history.
 * 
 * Snapshots provide a way to track and potentially rollback operations.
 * They store the operations performed and affected files for audit trails.
 */
export const SnapshotSchema = z.object({
  /** Unique identifier for this snapshot */
  id: z.string().describe('Unique snapshot ID'),
  
  /** When this snapshot was created */
  timestamp: z.date().describe('Creation time'),
  
  /** Operations included in this snapshot */
  operations: z.array(OperationSchema).describe('Operations in this snapshot'),
  
  /** Paths of all files affected by these operations */
  affectedFiles: z.array(z.string()).describe('Files affected'),
  
  /** Filesystem path where snapshot data is stored */
  snapshotPath: z.string().describe('Path to snapshot directory'),
});

export type Snapshot = z.infer<typeof SnapshotSchema>;

/**
 * File operation result for batch operations.
 * 
 * When performing operations on multiple files, this schema tracks
 * the success/failure of each individual file operation.
 */
export const FileOperationResultSchema = z.object({
  /** Whether this specific file operation succeeded */
  success: z.boolean().describe('Operation success status'),
  
  /** Path to the file */
  path: z.string().describe('File path'),
  
  /** Error message if this operation failed */
  error: z.string().optional().describe('Error message if failed'),
});

export type FileOperationResult = z.infer<typeof FileOperationResultSchema>;

/**
 * Index update event for real-time updates.
 * 
 * These events are emitted when the vault index changes, allowing
 * UI components to update without full re-indexing.
 */
export const IndexUpdateEventSchema = z.object({
  /** Type of change that occurred */
  type: z.enum(['added', 'modified', 'deleted']).describe('Update type'),
  
  /** Path to the affected file */
  path: z.string().describe('File path'),
  
  /** New metadata for added/modified files */
  metadata: z.any().optional().describe('New metadata if added/modified'),
});

export type IndexUpdateEvent = z.infer<typeof IndexUpdateEventSchema>;