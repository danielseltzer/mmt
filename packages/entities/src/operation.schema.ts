/**
 * @fileoverview Operation schemas for document manipulation.
 * 
 * This file defines all the operations that can be performed on documents
 * in a vault. Operations are the building blocks of both GUI actions and
 * scripts, representing atomic changes to documents.
 */

import { z } from 'zod';
import { BaseDocumentMetadataSchema } from './document.schema.js';

/**
 * Move/rename file operation.
 * 
 * Moves a file from one location to another, automatically updating all
 * links that reference the file to maintain link integrity.
 * 
 * @example
 * ```typescript
 * const op: MoveOperation = {
 *   type: 'move',
 *   sourcePath: '/vault/old/location.md',
 *   targetPath: '/vault/new/location.md'
 * };
 * ```
 */
export const MoveOperationSchema = z.object({
  type: z.literal('move'),
  /** Current absolute path of the file */
  sourcePath: z.string().describe('Current file path'),
  /** New absolute path for the file */
  targetPath: z.string().describe('New file path'),
});

export type MoveOperation = z.infer<typeof MoveOperationSchema>;

/**
 * Update frontmatter properties operation.
 * 
 * Modifies the YAML frontmatter of a document. Supports both merging new
 * properties with existing ones or completely replacing the frontmatter.
 * 
 * @example Merge mode (default)
 * ```typescript
 * const op: UpdateFrontmatterOperation = {
 *   type: 'update-frontmatter',
 *   path: '/vault/note.md',
 *   updates: { status: 'published', updated: '2024-01-01' },
 *   mode: 'merge'
 * };
 * ```
 * 
 * @example Replace mode
 * ```typescript
 * const op: UpdateFrontmatterOperation = {
 *   type: 'update-frontmatter',
 *   path: '/vault/note.md',
 *   updates: { title: 'New Title', tags: ['fresh'] },
 *   mode: 'replace'
 * };
 * ```
 */
export const UpdateFrontmatterOperationSchema = z.object({
  type: z.literal('update-frontmatter'),
  /** Absolute path to the file */
  path: z.string().describe('File path'),
  /** Key-value pairs to add/update in frontmatter */
  updates: z.record(z.unknown()).describe('Frontmatter updates'),
  /** Whether to merge with existing or replace entirely */
  mode: z.enum(['merge', 'replace']).describe('Update mode'),
});

export type UpdateFrontmatterOperation = z.infer<typeof UpdateFrontmatterOperationSchema>;

/**
 * Remove frontmatter properties operation.
 * 
 * Removes specific keys from a document's frontmatter. Useful for cleaning
 * up metadata or removing temporary properties.
 * 
 * @example
 * ```typescript
 * const op: RemoveFrontmatterOperation = {
 *   type: 'remove-frontmatter',
 *   path: '/vault/note.md',
 *   keys: ['draft', 'todo', 'temp_id']
 * };
 * ```
 */
export const RemoveFrontmatterOperationSchema = z.object({
  type: z.literal('remove-frontmatter'),
  /** Absolute path to the file */
  path: z.string().describe('File path'),
  /** Array of frontmatter keys to remove */
  keys: z.array(z.string()).describe('Keys to remove'),
});

export type RemoveFrontmatterOperation = z.infer<typeof RemoveFrontmatterOperationSchema>;

/**
 * Delete file operation.
 * 
 * Permanently removes a file from the vault. Use with caution as this
 * operation cannot be undone without external backups.
 * 
 * @example
 * ```typescript
 * const op: DeleteOperation = {
 *   type: 'delete',
 *   path: '/vault/obsolete-note.md'
 * };
 * ```
 */
export const DeleteOperationSchema = z.object({
  type: z.literal('delete'),
  /** Absolute path to the file to delete */
  path: z.string().describe('File path to delete'),
});

export type DeleteOperation = z.infer<typeof DeleteOperationSchema>;

/**
 * Create new file operation.
 * 
 * Creates a new markdown file with the specified content and optional
 * initial metadata. The directory path must exist or the operation will fail.
 * 
 * @example
 * ```typescript
 * const op: CreateOperation = {
 *   type: 'create',
 *   path: '/vault/new-note.md',
 *   content: '# New Note\n\nContent here...',
 *   metadata: {
 *     frontmatter: { 
 *       created: '2024-01-01',
 *       tags: ['new']
 *     }
 *   }
 * };
 * ```
 */
export const CreateOperationSchema = z.object({
  type: z.literal('create'),
  /** Absolute path where the file should be created */
  path: z.string().describe('File path to create'),
  /** Initial content of the file (including any frontmatter) */
  content: z.string().describe('File content'),
  /** Optional initial metadata (mainly for frontmatter) */
  metadata: BaseDocumentMetadataSchema.partial().optional().describe('Initial metadata'),
});

export type CreateOperation = z.infer<typeof CreateOperationSchema>;

/**
 * Discriminated union of all possible operations.
 * 
 * This schema represents any valid operation that can be performed on documents.
 * The discriminated union pattern allows TypeScript to provide exhaustive type
 * checking when handling operations.
 * 
 * @example Type-safe operation handling
 * ```typescript
 * function executeOperation(op: Operation) {
 *   switch (op.type) {
 *     case 'move':
 *       // TypeScript knows op is MoveOperation here
 *       moveFile(op.sourcePath, op.targetPath);
 *       break;
 *     case 'delete':
 *       // TypeScript knows op is DeleteOperation here
 *       deleteFile(op.path);
 *       break;
 *     // ... handle all operation types
 *   }
 * }
 * ```
 */
export const OperationSchema = z.discriminatedUnion('type', [
  MoveOperationSchema,
  UpdateFrontmatterOperationSchema,
  RemoveFrontmatterOperationSchema,
  DeleteOperationSchema,
  CreateOperationSchema,
]);

export type Operation = z.infer<typeof OperationSchema>;