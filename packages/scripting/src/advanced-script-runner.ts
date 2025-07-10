import type {
  Document,
  AdvancedScriptOperation,
  AdvancedOperationPipeline,
  ConditionalOperation,
  TryCatchOperation,
  ParallelOperation,
  ForEachOperation,
  MapOperation,
  ReduceOperation,
  BranchOperation,
  ScriptExecutionResult,
  SuccessResult,
  FailureResult,
  SkippedResult,
  ParallelConfig,
  AdvancedExecuteOptions,
  ScriptContext,
  ScriptOperation,
} from '@mmt/entities';
import { VaultIndexer } from '@mmt/indexer';
import { NodeFileSystem } from '@mmt/filesystem-access';
import type { FileSystemAccess } from '@mmt/filesystem-access';
import { QueryParser } from '@mmt/query-parser';
import pLimit from 'p-limit';

/**
 * Advanced script runner that supports conditional operations, error handling,
 * parallel execution, and control flow operations.
 */
export class AdvancedScriptRunner {
  private pipelineContext: Record<string, any> = {};
  protected options?: AdvancedExecuteOptions;
  private context: ScriptContext;
  private indexer: VaultIndexer;
  private fs: FileSystemAccess;
  private queryParser: QueryParser;

  constructor(context: ScriptContext) {
    this.context = context;
    this.indexer = context.indexer;
    this.fs = new NodeFileSystem();
    this.queryParser = new QueryParser();
  }

  /**
   * Execute an advanced operation pipeline
   */
  async executeAdvancedPipeline(
    pipeline: AdvancedOperationPipeline,
    documents: Document[]
  ): Promise<ScriptExecutionResult> {
    // Initialize pipeline context
    this.pipelineContext = pipeline.context || {};
    this.options = pipeline.options;
    
    const startTime = new Date();
    const results: (SuccessResult | FailureResult | SkippedResult)[] = [];
    
    // Process operations
    for (const operation of pipeline.operations) {
      if (operation.type === 'parallel') {
        const parallelResults = await this.executeParallelOperations(
          (operation as ParallelOperation).operations,
          documents,
          (operation as ParallelOperation).config
        );
        results.push(...parallelResults.succeeded, ...parallelResults.failed, ...parallelResults.skipped);
      } else if (operation.type === 'forEach') {
        const forEachResults = await this.executeForEach(
          operation as ForEachOperation,
          documents
        );
        results.push(...forEachResults);
      } else if (operation.type === 'reduce') {
        await this.executeReduce(operation as ReduceOperation, documents);
      } else if (operation.type === 'branch') {
        const branchResults = await this.executeBranch(
          operation as BranchOperation,
          documents
        );
        results.push(...branchResults);
      } else {
        // Regular operations
        for (const doc of documents) {
          const result = await this.executeOperation(operation, doc);
          results.push(result);
        }
      }
    }
    
    const endTime = new Date();
    
    const succeeded = results.filter((r): r is SuccessResult => 
      'item' in r && 'operation' in r && !('error' in r) && !('reason' in r)
    );
    const failed = results.filter((r): r is FailureResult => 'error' in r);
    const skipped = results.filter((r): r is SkippedResult => 'reason' in r);
    
    return {
      attempted: documents,
      succeeded,
      failed,
      skipped,
      stats: {
        duration: endTime.getTime() - startTime.getTime(),
        startTime,
        endTime,
      },
    };
  }

  /**
   * Execute a single operation with advanced features support
   */
  private async executeOperation(
    operation: AdvancedScriptOperation,
    document: Document
  ): Promise<SuccessResult | FailureResult | SkippedResult> {
    // Handle advanced operation types
    if ('type' in operation) {
      switch (operation.type) {
        case 'conditional':
          return this.executeConditional(operation as ConditionalOperation, document);
        
        case 'try-catch':
          return this.executeTryCatch(operation as TryCatchOperation, document);
        
        case 'parallel':
          throw new Error('Parallel operations should be handled at pipeline level');
        
        case 'forEach':
          throw new Error('ForEach operations should be handled at pipeline level');
        
        case 'map':
          return this.executeMap(operation as MapOperation, document);
        
        case 'reduce':
          throw new Error('Reduce operations should be handled at pipeline level');
        
        case 'branch':
          throw new Error('Branch operations should be handled at pipeline level');
        
        default:
          // Execute standard operations
          return this.executeStandardOperation(operation as ScriptOperation, document);
      }
    }
    
    return this.executeStandardOperation(operation as ScriptOperation, document);
  }

  /**
   * Execute conditional operation
   */
  private async executeConditional(
    operation: ConditionalOperation,
    document: Document
  ): Promise<SuccessResult | FailureResult | SkippedResult> {
    try {
      const condition = operation.condition(document);
      
      if (condition) {
        return this.executeOperation(operation.then, document);
      } else if (operation.else) {
        return this.executeOperation(operation.else, document);
      } else {
        return {
          item: document,
          operation,
          reason: 'Condition evaluated to false, no else branch',
        };
      }
    } catch (error) {
      return {
        item: document,
        operation,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Execute try-catch operation
   */
  private async executeTryCatch(
    operation: TryCatchOperation,
    document: Document
  ): Promise<SuccessResult | FailureResult | SkippedResult> {
    let tryResult: SuccessResult | FailureResult | SkippedResult;
    
    try {
      tryResult = await this.executeOperation(operation.try, document);
      
      if ('error' in tryResult) {
        // Try failed, execute catch
        const catchResult = await this.executeOperation(operation.catch, document);
        tryResult = catchResult;
      }
    } catch (error) {
      // Unexpected error, execute catch
      tryResult = await this.executeOperation(operation.catch, document);
    } finally {
      if (operation.finally) {
        // Execute finally regardless of outcome
        await this.executeOperation(operation.finally, document);
      }
    }
    
    return tryResult;
  }

  /**
   * Execute map operation
   */
  private async executeMap(
    operation: MapOperation,
    document: Document
  ): Promise<SuccessResult | FailureResult> {
    try {
      const result = await operation.transform(document);
      
      // Store result in document metadata if outputField specified
      if (operation.outputField) {
        document.metadata = {
          ...document.metadata,
          [operation.outputField]: result,
        };
      }
      
      return {
        item: document,
        operation,
        details: { transformResult: result },
      };
    } catch (error) {
      return {
        item: document,
        operation,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Execute standard scripting operations
   */
  private async executeStandardOperation(
    operation: ScriptOperation,
    document: Document
  ): Promise<SuccessResult | FailureResult | SkippedResult> {
    // For now, just return a preview result for standard operations
    // The full implementation would integrate with document-operations package
    return {
      item: document,
      operation,
      details: {
        preview: true,
        operationType: operation.type,
        wouldAffect: document.path,
      },
    };
  }

  /**
   * Execute operations with parallel support
   */
  async executeParallelOperations(
    operations: AdvancedScriptOperation[],
    documents: Document[],
    config?: ParallelConfig
  ): Promise<ScriptExecutionResult> {
    const maxConcurrency = config?.maxConcurrency || 5;
    const batchSize = config?.batchSize;
    const timeout = config?.timeout;
    
    const limit = pLimit(maxConcurrency);
    const results: (SuccessResult | FailureResult | SkippedResult)[] = [];
    
    // Process documents in batches if specified
    if (batchSize) {
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(doc =>
            limit(() => this.executeOperationsOnDocument(operations, doc, timeout))
          )
        );
        results.push(...batchResults.flat());
      }
    } else {
      // Process all documents with concurrency limit
      const allResults = await Promise.all(
        documents.map(doc =>
          limit(() => this.executeOperationsOnDocument(operations, doc, timeout))
        )
      );
      results.push(...allResults.flat());
    }
    
    return this.aggregateResults(results, documents);
  }

  /**
   * Execute operations on a single document with timeout
   */
  private async executeOperationsOnDocument(
    operations: AdvancedScriptOperation[],
    document: Document,
    timeout?: number
  ): Promise<(SuccessResult | FailureResult | SkippedResult)[]> {
    const executeWithTimeout = async () => {
      const results: (SuccessResult | FailureResult | SkippedResult)[] = [];
      
      for (const operation of operations) {
        const result = await this.executeOperation(operation, document);
        results.push(result);
        
        // Stop processing if operation failed and not continuing on error
        if ('error' in result && !this.options?.continueOnError) {
          break;
        }
      }
      
      return results;
    };
    
    if (timeout) {
      return Promise.race([
        executeWithTimeout(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), timeout)
        ),
      ]);
    }
    
    return executeWithTimeout();
  }

  /**
   * Execute reduce operation across document set
   */
  async executeReduce(
    operation: ReduceOperation,
    documents: Document[]
  ): Promise<any> {
    const result = documents.reduce(
      (acc, doc) => operation.reducer(acc, doc),
      operation.initialValue
    );
    
    // Store result in pipeline context
    this.pipelineContext[operation.outputKey] = result;
    
    return result;
  }

  /**
   * Execute forEach operation
   */
  private async executeForEach(
    operation: ForEachOperation,
    documents: Document[]
  ): Promise<(SuccessResult | FailureResult | SkippedResult)[]> {
    if (operation.parallel) {
      return this.executeParallelOperations(
        [operation.operation],
        documents,
        operation.parallel
      ).then(r => [...r.succeeded, ...r.failed, ...r.skipped]);
    }
    
    const results: (SuccessResult | FailureResult | SkippedResult)[] = [];
    for (const doc of documents) {
      const result = await this.executeOperation(operation.operation, doc);
      results.push(result);
    }
    return results;
  }

  /**
   * Execute branch operation
   */
  private async executeBranch(
    operation: BranchOperation,
    documents: Document[]
  ): Promise<(SuccessResult | FailureResult | SkippedResult)[]> {
    const branchResults: Map<string, (SuccessResult | FailureResult | SkippedResult)[]> = new Map();
    
    // Execute each branch
    for (const branch of operation.branches) {
      const matchingDocs = documents.filter(doc => branch.condition(doc));
      if (matchingDocs.length > 0) {
        const results = await this.executeAdvancedPipeline(
          branch.pipeline,
          matchingDocs
        );
        branchResults.set(
          branch.name,
          [...results.succeeded, ...results.failed, ...results.skipped]
        );
      }
    }
    
    // Merge results based on strategy
    const allResults = Array.from(branchResults.values()).flat();
    return allResults;
  }

  /**
   * Aggregate results into execution result
   */
  private aggregateResults(
    results: (SuccessResult | FailureResult | SkippedResult)[],
    documents: Document[],
    startTime: Date,
    endTime: Date
  ): ScriptExecutionResult {
    const succeeded = results.filter((r): r is SuccessResult => 
      'item' in r && 'operation' in r && !('error' in r) && !('reason' in r)
    );
    const failed = results.filter((r): r is FailureResult => 'error' in r);
    const skipped = results.filter((r): r is SkippedResult => 'reason' in r);
    
    return {
      attempted: documents,
      succeeded,
      failed,
      skipped,
      stats: {
        duration: endTime.getTime() - startTime.getTime(),
        startTime,
        endTime,
      },
    };
  }
}
