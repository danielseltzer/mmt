import type { OperationType, DocumentOperation, OperationFactory } from '../types.js';
import { MoveOperation, type MoveOperationOptions } from '../operations/move-operation.js';
import { RenameOperation, type RenameOperationOptions } from '../operations/rename-operation.js';
import { UpdateFrontmatterOperation, type UpdateFrontmatterOperationOptions } from '../operations/update-frontmatter.js';
import { DeleteOperation, type DeleteOperationOptions } from '../operations/delete-operation.js';

/**
 * Registry for document operations
 */
export class OperationRegistry {
  private factories = new Map<OperationType, OperationFactory>();

  constructor() {
    // Register built-in operations
    this.registerDefaults();
  }

  /**
   * Register an operation factory
   */
  register(type: OperationType, factory: OperationFactory): void {
    if (this.factories.has(type)) {
      throw new Error(`Operation type "${type}" is already registered`);
    }
    this.factories.set(type, factory);
  }

  /**
   * Check if an operation type is registered
   */
  has(type: OperationType): boolean {
    return this.factories.has(type);
  }

  /**
   * Get all registered operation types
   */
  getTypes(): OperationType[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Create an operation instance
   */
  create(type: OperationType, options: unknown): DocumentOperation {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`Unknown operation type: ${type}`);
    }
    return factory(options);
  }

  /**
   * Register default operations
   */
  private registerDefaults(): void {
    // These will be implemented in the next phase
    this.register('move', (options) => new MoveOperation(options as MoveOperationOptions));
    this.register('rename', (options) => new RenameOperation(options as RenameOperationOptions));
    this.register('updateFrontmatter', (options) => new UpdateFrontmatterOperation(options as UpdateFrontmatterOperationOptions));
    this.register('delete', (options) => new DeleteOperation(options as DeleteOperationOptions));
  }
}