import type { OperationType, DocumentOperation, OperationFactory } from '../types.js';
import { MoveOperation } from '../operations/move-operation.js';
import { RenameOperation } from '../operations/rename-operation.js';
import { UpdateFrontmatterOperation } from '../operations/update-frontmatter.js';
import { DeleteOperation } from '../operations/delete-operation.js';

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
  register<T = any>(type: OperationType, factory: OperationFactory<T>): void {
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
  create<T = any>(type: OperationType, options: T): DocumentOperation {
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
    this.register('move', (options) => new MoveOperation(options));
    this.register('rename', (options) => new RenameOperation(options));
    this.register('updateFrontmatter', (options) => new UpdateFrontmatterOperation(options));
    this.register('delete', (options) => new DeleteOperation(options));
  }
}