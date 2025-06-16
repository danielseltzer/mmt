import { readFile } from 'fs/promises';
import { pathToFileURL } from 'url';
import type {
  ScriptContext,
  OperationPipeline,
  ScriptExecutionResult,
  ExecutionOptions,
  Document,
  SelectCriteria,
  ScriptOperation,
  SuccessResult,
  FailureResult,
  SkippedResult,
} from '@mmt/entities';
import { OperationPipelineSchema } from '@mmt/entities';
import type { FileSystemAccess } from '@mmt/filesystem-access';
import { QueryParser } from '@mmt/query-parser';
import type { Script } from './script.interface.js';
import { ResultFormatter } from './result-formatter.js';

export interface ScriptRunnerOptions {
  config: {
    vaultPath: string;
    indexPath: string;
  };
  fileSystem: FileSystemAccess;
  queryParser: QueryParser;
  outputStream?: NodeJS.WritableStream;
}

/**
 * Executes MMT scripts by loading, validating, and running operation pipelines.
 */
export class ScriptRunner {
  private readonly config: ScriptRunnerOptions['config'];
  private readonly fs: FileSystemAccess;
  private readonly queryParser: QueryParser;
  private readonly output: NodeJS.WritableStream;
  private readonly formatter: ResultFormatter;

  constructor(options: ScriptRunnerOptions) {
    this.config = options.config;
    this.fs = options.fileSystem;
    this.queryParser = options.queryParser;
    this.output = options.outputStream ?? process.stdout;
    this.formatter = new ResultFormatter();
  }

  /**
   * Load and execute a script from a file path.
   */
  async runScript(scriptPath: string, cliOptions: Record<string, any> = {}): Promise<ScriptExecutionResult> {
    // Load the script module
    const script = await this.loadScript(scriptPath);
    
    // Create script context
    const context: ScriptContext = {
      vaultPath: this.config.vaultPath,
      indexPath: this.config.indexPath,
      scriptPath,
      cliOptions,
    };

    // Get pipeline definition from script
    const pipeline = script.define(context);
    
    // Validate pipeline
    const validatedPipeline = OperationPipelineSchema.parse(pipeline);
    
    // Merge execution options (CLI overrides script)
    const executionOptions: ExecutionOptions = {
      executeNow: cliOptions.execute ?? validatedPipeline.options?.executeNow ?? false,
      failFast: validatedPipeline.options?.failFast ?? false,
      parallel: validatedPipeline.options?.parallel ?? false,
    };

    // Execute the pipeline
    return this.executePipeline(validatedPipeline, executionOptions);
  }

  /**
   * Execute a validated operation pipeline.
   */
  async executePipeline(
    pipeline: OperationPipeline,
    options: ExecutionOptions
  ): Promise<ScriptExecutionResult> {
    const startTime = new Date();
    
    // Select documents
    const selectedDocs = await this.selectDocuments(pipeline.select);
    
    // Apply filter if provided
    let documents = selectedDocs;
    if (pipeline.filter) {
      documents = selectedDocs.filter(pipeline.filter);
    }

    // Initialize result collectors
    const attempted = documents;
    const succeeded: SuccessResult[] = [];
    const failed: FailureResult[] = [];
    const skipped: SkippedResult[] = [];

    // Execute operations
    if (options.executeNow) {
      // Real execution
      for (const doc of documents) {
        for (const operation of pipeline.operations) {
          try {
            const result = await this.executeOperation(doc, operation);
            if (result.skipped) {
              skipped.push({
                item: doc,
                operation,
                reason: result.reason!,
              });
            } else {
              succeeded.push({
                item: doc,
                operation,
                details: result.details,
              });
            }
          } catch (error) {
            failed.push({
              item: doc,
              operation,
              error: error instanceof Error ? error : new Error(String(error)),
            });
            if (options.failFast) {
              break;
            }
          }
        }
        if (options.failFast && failed.length > 0) {
          break;
        }
      }
    } else {
      // Preview mode - all operations are "successful" but not executed
      for (const doc of documents) {
        for (const operation of pipeline.operations) {
          succeeded.push({
            item: doc,
            operation,
            details: { preview: true },
          });
        }
      }
    }

    const endTime = new Date();
    const result: ScriptExecutionResult = {
      attempted,
      succeeded,
      failed,
      skipped,
      stats: {
        duration: endTime.getTime() - startTime.getTime(),
        startTime,
        endTime,
      },
    };

    // Format and output results
    const formatted = this.formatter.format(result, {
      format: pipeline.output?.format ?? 'summary',
      fields: pipeline.output?.fields,
      isPreview: !options.executeNow,
    });
    
    this.output.write(formatted + '\n');

    return result;
  }

  /**
   * Load a script module from a file path.
   */
  private async loadScript(scriptPath: string): Promise<Script> {
    try {
      // Convert to file URL for ES module import
      const fileUrl = pathToFileURL(scriptPath).href;
      const module = await import(fileUrl);
      
      // Check for default export
      if (!module.default) {
        throw new Error(`Script ${scriptPath} must have a default export`);
      }

      // Instantiate if it's a class, otherwise use as-is
      const script = typeof module.default === 'function' 
        ? new module.default()
        : module.default;

      // Validate it implements Script interface
      if (typeof script.define !== 'function') {
        throw new Error(`Script ${scriptPath} must implement Script interface with define() method`);
      }

      return script;
    } catch (error) {
      throw new Error(`Failed to load script ${scriptPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Select documents based on criteria.
   */
  private async selectDocuments(criteria: SelectCriteria): Promise<Document[]> {
    // Handle explicit file list
    if ('files' in criteria && criteria.files) {
      const docs: Document[] = [];
      for (const filePath of criteria.files) {
        const exists = await this.fs.exists(filePath);
        if (exists) {
          const stats = await this.fs.stat(filePath);
          docs.push({
            path: filePath,
            content: '', // Will be loaded if needed
            metadata: {
              name: filePath.replace(/\.md$/, '').split('/').pop() || filePath,
              modified: stats.mtime,
              size: stats.size,
              frontmatter: {},
              tags: [],
              links: [],
            },
          });
        }
      }
      return docs;
    }

    // Handle query-based selection
    // This is a simplified implementation - the real one would use the indexer
    const query = Object.entries(criteria as Record<string, any>)
      .filter(([key]) => key !== 'files')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as Record<string, any>);

    // For now, just handle basic fs:path patterns
    if (query['fs:path']) {
      const pattern = query['fs:path'] as string;
      // This would use the indexer in the real implementation
      // For now, returning empty array
      return [];
    }

    return [];
  }

  /**
   * Execute a single operation on a document.
   */
  private async executeOperation(
    doc: Document,
    operation: ScriptOperation
  ): Promise<{ skipped?: boolean; reason?: string; details?: any }> {
    // This is a placeholder - real implementation would delegate to
    // the appropriate operation package based on operation.type
    switch (operation.type) {
      case 'move':
        // Would call file-relocator package
        return { details: { moved: true } };
      
      case 'delete':
        // Would call filesystem-access
        return { details: { deleted: true } };
      
      case 'updateFrontmatter':
        // Would call document-operations package
        return { details: { updated: true } };
      
      default:
        return { skipped: true, reason: `Unknown operation type: ${operation.type}` };
    }
  }
}