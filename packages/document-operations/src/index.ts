/**
 * @mmt/document-operations
 * 
 * Safe, transactional operations for modifying markdown documents
 */

// Core types
export * from './types.js';

// Registry
export { OperationRegistry } from './core/operation-registry.js';

// Operations
export { MoveOperation, type MoveOperationOptions } from './operations/move-operation.js';
export { RenameOperation, type RenameOperationOptions } from './operations/rename-operation.js';
export { UpdateFrontmatterOperation, type UpdateFrontmatterOptions } from './operations/update-frontmatter.js';
export { DeleteOperation, type DeleteOperationOptions } from './operations/delete-operation.js';