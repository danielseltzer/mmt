import type {
  Document,
  AdvancedScriptOperation,
  AdvancedOperationPipeline,
  SelectCriteria,
  ParallelConfig,
  ScriptOperation,
} from '@mmt/entities';
import type { VaultIndexer } from '@mmt/indexer';

/**
 * Fluent API builder for advanced scripting operations.
 * Provides a chainable interface similar to the example in the issue.
 */
export class AdvancedScriptBuilder {
  private pipeline: Partial<AdvancedOperationPipeline> = {};
  private operations: AdvancedScriptOperation[] = [];
  private indexer?: VaultIndexer;

  constructor(indexer?: VaultIndexer) {
    this.indexer = indexer;
  }

  /**
   * Set the vault configuration to use
   */
  useConfig(configName: string): this {
    // This would be handled by the script runner context
    return this;
  }

  /**
   * Set the document selection criteria
   */
  query(criteria: string | SelectCriteria): this {
    if (typeof criteria === 'string') {
      // Parse query string into criteria object
      this.pipeline.select = this.parseQuery(criteria);
    } else {
      this.pipeline.select = criteria;
    }
    return this;
  }

  /**
   * Set parallel execution configuration
   */
  parallel(maxConcurrency: number): this {
    if (!this.pipeline.options) {
      this.pipeline.options = {};
    }
    this.pipeline.options.parallel = {
      maxConcurrency,
    };
    return this;
  }

  /**
   * Execute an operation for each document
   */
  forEach(
    operation: (doc: Document) => Promise<AdvancedScriptOperation | AdvancedScriptOperation[]>
  ): this {
    this.operations.push({
      type: 'forEach',
      operation: async (doc: Document) => {
        const ops = await operation(doc);
        return Array.isArray(ops) ? ops : [ops];
      },
      parallel: this.pipeline.options?.parallel,
    } as any);
    return this;
  }

  /**
   * Add a conditional operation
   */
  conditional(
    condition: (doc: Document) => boolean,
    thenOp: ScriptOperation,
    elseOp?: ScriptOperation
  ): this {
    this.operations.push({
      type: 'conditional',
      condition,
      then: thenOp,
      else: elseOp,
    });
    return this;
  }

  /**
   * Add a try-catch operation
   */
  try(
    tryOp: ScriptOperation,
    catchOp: ScriptOperation,
    finallyOp?: ScriptOperation
  ): this {
    this.operations.push({
      type: 'try-catch',
      try: tryOp,
      catch: catchOp,
      finally: finallyOp,
    });
    return this;
  }

  /**
   * Map over documents
   */
  map<T>(
    transform: (doc: Document) => T | Promise<T>,
    outputField?: string
  ): this {
    this.operations.push({
      type: 'map',
      transform,
      outputField,
    });
    return this;
  }

  /**
   * Reduce documents to a single value
   */
  reduce<T>(
    reducer: (acc: T, doc: Document) => T,
    initialValue: T,
    outputKey: string
  ): this {
    this.operations.push({
      type: 'reduce',
      reducer,
      initialValue,
      outputKey,
    });
    return this;
  }

  /**
   * Create operation branches
   */
  branch(...branches: Array<{
    name: string;
    condition: (doc: Document) => boolean;
    builder: (b: AdvancedScriptBuilder) => AdvancedScriptBuilder;
  }>): this {
    this.operations.push({
      type: 'branch',
      branches: branches.map(branch => ({
        name: branch.name,
        condition: branch.condition,
        pipeline: branch.builder(new AdvancedScriptBuilder(this.indexer)).build(),
      })),
    });
    return this;
  }

  /**
   * Build the final pipeline
   */
  build(): AdvancedOperationPipeline {
    if (!this.pipeline.select) {
      throw new Error('No selection criteria specified. Use query() to select documents.');
    }

    return {
      ...this.pipeline,
      select: this.pipeline.select,
      operations: this.operations,
    } as AdvancedOperationPipeline;
  }

  /**
   * Execute the pipeline (convenience method)
   */
  async execute(): Promise<any> {
    // This would be implemented by the script runner
    throw new Error('Use AdvancedScriptRunner to execute the pipeline');
  }

  /**
   * Parse a query string into selection criteria
   */
  private parseQuery(query: string): SelectCriteria {
    // Simple parser for queries like "tag:process"
    const parts = query.split(':');
    if (parts.length === 2) {
      const [field, value] = parts;
      if (field === 'tag') {
        return { 'metadata.tags': { $contains: value } };
      }
      return { [field]: value };
    }
    
    // Default to path-based search
    return { path: { $regex: query } };
  }
}

/**
 * Factory function to create a new advanced script builder
 */
export function mmt(indexer?: VaultIndexer): AdvancedScriptBuilder {
  return new AdvancedScriptBuilder(indexer);
}

/**
 * Operations builder for use within forEach and other contexts
 */
export class OperationsBuilder {
  private ops: ScriptOperation[] = [];

  updateMetadata(updates: Record<string, any>): this {
    this.ops.push({
      type: 'updateFrontmatter',
      updates,
      mode: 'merge',
    } as any);
    return this;
  }

  addTag(tag: string): this {
    this.ops.push({
      type: 'updateFrontmatter',
      updates: { tags: { $push: tag } },
      mode: 'merge',
    } as any);
    return this;
  }

  moveToFolder(folder: string): this {
    this.ops.push({
      type: 'move',
      targetFolder: folder,
    } as any);
    return this;
  }

  build(): ScriptOperation[] {
    return this.ops;
  }
}

/**
 * Helper to create operations
 */
export const operations = () => new OperationsBuilder();
