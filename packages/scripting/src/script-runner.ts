import { pathToFileURL } from 'url';
import { join, basename } from 'path';
import type { ColumnTable } from 'arquero';
type Table = ColumnTable;
import type {
  ScriptContext,
  OperationPipeline,
  ScriptExecutionResult,
  Document,
  SelectCriteria,
  ScriptOperation,
  SuccessResult,
  FailureResult,
  SkippedResult,
} from '@mmt/entities';
import { OperationPipelineSchema } from '@mmt/entities';
import type { FileSystemAccess } from '@mmt/filesystem-access';
import { VaultIndexer } from '@mmt/indexer';
import type { Query, PageMetadata } from '@mmt/indexer';
import { QueryParser } from '@mmt/query-parser';
// import { OperationRegistry } from '@mmt/document-operations';
// import type { OperationContext, OperationResult } from '@mmt/document-operations';
import type { Script } from './script.interface.js';
import { ResultFormatter } from './result-formatter.js';
import { AnalysisRunner } from './analysis-runner.js';
import { aq } from './analysis-pipeline.js';
import { MarkdownReportGenerator } from './markdown-report-generator.js';

interface OperationExecutionResult {
  skipped?: boolean;
  reason?: string;
  details?: {
    document?: Document;
    backup?: {
      originalPath: string;
      backupPath: string;
    };
    dryRun?: boolean;
    preview?: boolean;
    type?: string;
    source?: string;
    target?: string;
    changes?: unknown;
  };
}

export interface ScriptRunnerOptions {
  config: {
    vaultPath: string;
    indexPath: string;
    fileWatching?: {
      enabled: boolean;
      debounceMs?: number;
      ignorePatterns?: string[];
    };
    apiPort: number;
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
  private readonly analysisRunner: AnalysisRunner;
  private readonly reportGenerator: MarkdownReportGenerator;
  // private readonly operationRegistry: OperationRegistry;
  private indexer?: VaultIndexer;
  private readonly apiUrl: string;

  constructor(options: ScriptRunnerOptions) {
    this.config = options.config;
    this.fs = options.fileSystem;
    this.queryParser = options.queryParser;
    this.output = options.outputStream ?? process.stdout;
    this.formatter = new ResultFormatter();
    this.analysisRunner = new AnalysisRunner();
    this.reportGenerator = new MarkdownReportGenerator();
    // this.operationRegistry = new OperationRegistry();
    this.apiUrl = `http://localhost:${options.config.apiPort}`;
  }

  /**
   * Load and execute a script from a file path.
   */
  async runScript(scriptPath: string, cliOptions: Record<string, unknown> = {}): Promise<ScriptExecutionResult> {
    // Initialize indexer if not already done
    if (this.indexer === undefined) {
      this.indexer = new VaultIndexer({
        vaultPath: this.config.vaultPath,
        fileSystem: this.fs,
        useCache: true,
        useWorkers: true,
        fileWatching: this.config.fileWatching,
      });
      await this.indexer.initialize();
    }
    
    // Load the script module
    const script = await this.loadScript(scriptPath);
    
    // Create script context
    const context: ScriptContext = {
      vaultPath: this.config.vaultPath,
      indexPath: this.config.indexPath,
      scriptPath,
      cliOptions,
      indexer: this.indexer,
    };
    
    // Extend context with Arquero namespace for scripts
    const extendedContext = { ...context, aq };

    // Get pipeline definition from script
    const pipeline = script.define(extendedContext);
    
    // Validate pipeline
    const validatedPipeline = OperationPipelineSchema.parse(pipeline);
    
    // Update pipeline with CLI execution option
    if (cliOptions.execute) {
      validatedPipeline.options = {
        destructive: true,
        confirmCount: false,
        continueOnError: false,
        ...validatedPipeline.options,
      };
    }

    // Execute the pipeline
    const result = await this.executePipeline(validatedPipeline);
    
    // Generate report if requested
    if (cliOptions.reportPath !== undefined && cliOptions.reportPath !== null) {
      const resultWithTable = result as ScriptExecutionResult & { analysisTable?: Table };
      await this.reportGenerator.generateReport({
        scriptPath,
        vaultPath: this.config.vaultPath,
        executionResult: result,
        pipeline: validatedPipeline,
        analysisTable: resultWithTable.analysisTable,
        reportPath: cliOptions.reportPath as string,
        isPreview: !validatedPipeline.options?.destructive,
      });
    }
    
    return result;
  }

  /**
   * Execute a validated operation pipeline.
   */
  async executePipeline(
    pipeline: OperationPipeline
  ): Promise<ScriptExecutionResult> {
    const startTime = new Date();

    // Check if this is an analysis pipeline (handled locally)
    const hasAnalysisOps = pipeline.operations.some(op => 
      op.type === 'analyze' || op.type === 'transform' || op.type === 'aggregate'
    );
    
    if (hasAnalysisOps) {
      // Analysis operations need local document access, so handle them here
      const selectedDocs = await this.selectDocuments(pipeline.select);
      let documents = selectedDocs;
      if (pipeline.filter !== undefined) {
        documents = selectedDocs.filter((doc) => Boolean(pipeline.filter?.(doc)));
      }
      return this.executeAnalysisPipeline(pipeline, documents, startTime);
    }

    // For non-analysis operations, call the API
    try {
      // If there's a filter function, we need to apply it locally first
      let pipelineToSend = pipeline;
      if (pipeline.filter !== undefined) {
        // Select documents locally to apply the filter
        const selectedDocs = await this.selectDocuments(pipeline.select);
        const filteredDocs = selectedDocs.filter((doc) => Boolean(pipeline.filter?.(doc)));
        
        // Create a new pipeline with explicit file list instead of criteria
        pipelineToSend = {
          ...pipeline,
          select: { files: filteredDocs.map(d => d.path) },
          filter: undefined // Remove the filter since we already applied it
        };
      }

      // Call the API
      const response = await fetch(`${this.apiUrl}/api/pipelines/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pipelineToSend),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${response.status} - ${error}`);
      }

      const apiResult = await response.json() as {
        success: boolean;
        documentsProcessed: number;
        operations: {
          succeeded: number;
          failed: number;
          skipped: number;
        };
        results?: {
          succeeded: Array<{
            document: Document;
            operation: ScriptOperation;
            details: any;
          }>;
          failed: Array<{
            document: Document;
            operation: ScriptOperation;
            error: string;
          }>;
          skipped: Array<{
            document: Document;
            operation: ScriptOperation;
            reason: string;
          }>;
        };
        errors?: Array<{
          document: string;
          operation: string;
          error: string;
        }>;
      };

      // Convert API result to ScriptExecutionResult format
      const endTime = new Date();
      
      // Collect all documents that were attempted
      const attempted: Document[] = [];
      if (apiResult.results) {
        // Add documents from each result category
        apiResult.results.succeeded.forEach(r => attempted.push(r.document));
        apiResult.results.failed.forEach(r => attempted.push(r.document));
        apiResult.results.skipped.forEach(r => attempted.push(r.document));
      }
      
      const result: ScriptExecutionResult = {
        attempted,
        succeeded: apiResult.results?.succeeded.map(r => ({
          item: r.document,
          operation: r.operation,
          details: {
            ...r.details,
            preview: !pipeline.options?.destructive
          },
        })) ?? [],
        failed: apiResult.results?.failed.map(r => ({
          item: r.document,
          operation: r.operation,
          error: new Error(r.error),
        })) ?? [],
        skipped: apiResult.results?.skipped.map(r => ({
          item: r.document,
          operation: r.operation,
          reason: r.reason,
        })) ?? [],
        stats: {
          duration: endTime.getTime() - startTime.getTime(),
          startTime,
          endTime,
        },
      };

      // Format output based on pipeline configuration
      let format = 'summary';
      let fields: string[] | undefined;
      
      if (pipeline.output !== undefined) {
        const consoleOutput = pipeline.output.find(o => o.destination === 'console');
        if (consoleOutput !== undefined) {
          ({ format, fields } = consoleOutput);
        }
      }
      
      const formatted = this.formatter.format(result, {
        format: format as 'summary' | 'detailed' | 'csv' | 'json' | 'table',
        fields,
        isPreview: !pipeline.options?.destructive,
      });
      
      this.output.write(`${formatted}\n`);

      return result;
    } catch (error) {
      const endTime = new Date();
      const failedResult: ScriptExecutionResult = {
        attempted: [],
        succeeded: [],
        failed: [{
          item: {} as Document,
          operation: pipeline.operations[0] ?? {} as ScriptOperation,
          error: error instanceof Error ? error : new Error(String(error)),
        }],
        skipped: [],
        stats: {
          duration: endTime.getTime() - startTime.getTime(),
          startTime,
          endTime,
        },
      };

      this.output.write(`Error executing pipeline: ${error instanceof Error ? error.message : String(error)}\n`);
      return failedResult;
    }
  }

  /**
   * Type guard to check if an object implements the Script interface.
   */
  private isValidScript(obj: unknown): obj is Script {
    return (
      obj !== null &&
      obj !== undefined &&
      typeof obj === 'object' &&
      'define' in obj &&
      typeof (obj as Script).define === 'function'
    );
  }

  /**
   * Load a script module from a file path.
   */
  private async loadScript(scriptPath: string): Promise<Script> {
    try {
      // Convert to file URL for ES module import
      const fileUrl = pathToFileURL(scriptPath).href;
      const module = await import(fileUrl) as { default?: Script | (new () => Script) };
      
      // Check for default export
      if (module.default === undefined) {
        throw new Error(`Script ${scriptPath} must have a default export`);
      }

      // Instantiate if it's a class, otherwise use as-is
      const scriptExport = module.default;
      let script: Script;
      
      if (typeof scriptExport === 'function') {
        // It's a constructor, instantiate it
        const ScriptConstructor = scriptExport;
        script = new ScriptConstructor();
      } else {
        script = scriptExport;
      }

      // Validate it implements Script interface
      if (!this.isValidScript(script)) {
        throw new Error(`Script ${scriptPath} must implement Script interface with define() method`);
      }

      return script;
    } catch (error) {
      throw new Error(`Failed to load script ${scriptPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Select documents based on criteria.
   * 
   * Supports both explicit file lists and query-based selection using the indexer.
   */
  private async selectDocuments(criteria: SelectCriteria): Promise<Document[]> {
    // Handle explicit file list
    if ('files' in criteria && criteria.files !== undefined) {
      const docs: Document[] = [];
      for (const filePath of criteria.files) {
        if (typeof filePath !== 'string') {
          continue;
        }
        const exists = await this.fs.exists(filePath);
        if (exists) {
          const stats = await this.fs.stat(filePath);
          const fileName = filePath.replace(/\.md$/u, '').split('/').pop() ?? filePath;
          docs.push({
            path: filePath,
            content: '', // Content loading on demand
            metadata: {
              name: fileName,
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

    // Query-based selection using indexer
    if (this.indexer === undefined) {
      throw new Error('Indexer not initialized');
    }

    const query = Object.entries(criteria as Record<string, unknown>)
      .filter(([key]) => key !== 'files')
      .reduce<Record<string, unknown>>((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    if (Object.keys(query).length === 0) {
      // No criteria - return all documents
      const allDocs = this.indexer.getAllDocuments();
      return this.convertMetadataToDocuments(allDocs);
    }

    // Convert criteria to indexer query
    const indexerQuery = this.buildIndexerQuery(query);
    const results = this.indexer.query(indexerQuery);
    return this.convertMetadataToDocuments(results);
  }

  /**
   * Build an indexer query from script selection criteria.
   */
  private buildIndexerQuery(criteria: Record<string, unknown>): Query {
    const conditions: Query['conditions'] = [];

    for (const [field, value] of Object.entries(criteria)) {
      // Determine operator based on value type
      let operator: Query['conditions'][0]['operator'] = 'equals';
      if (typeof value === 'string' && value.includes('*')) {
        operator = 'matches';
      }

      conditions.push({
        field,
        operator,
        value,
      });
    }

    return { conditions };
  }

  /**
   * Convert PageMetadata from indexer to Document format for scripts.
   */
  private convertMetadataToDocuments(metadata: PageMetadata[]): Document[] {
    if (this.indexer === undefined) {
      throw new Error('Indexer not initialized');
    }
    
    const documents: Document[] = [];
    
    for (const meta of metadata) {
      // Get outgoing links for this document
      const outgoingLinks = this.indexer.getOutgoingLinks(meta.relativePath);
      
      // Get incoming links (backlinks) for this document
      const incomingLinks = this.indexer.getBacklinks(meta.relativePath);
      
      documents.push({
        path: meta.path,
        content: '', // Content loaded on demand
        metadata: {
          name: meta.basename,
          modified: new Date(meta.mtime),
          size: meta.size,
          frontmatter: meta.frontmatter,
          tags: meta.tags,
          // Convert PageMetadata targets to relative paths
          links: outgoingLinks.map(targetDoc => targetDoc.relativePath),
          backlinks: incomingLinks.map(sourceDoc => sourceDoc.relativePath),
        },
      });
    }
    
    return documents;
  }

  // These methods are no longer used - operations are now executed via the API
  /*
  private async executeOperation(
    doc: Document,
    operation: ScriptOperation
  ): Promise<OperationExecutionResult> {
    // Analysis operations are handled separately
    if (operation.type === 'analyze' || operation.type === 'transform' || operation.type === 'aggregate') {
      throw new Error(`Analysis operation '${operation.type}' should be handled by executeAnalysisPipeline`);
    }

    // Initialize indexer if needed
    if (this.indexer === undefined) {
      throw new Error('Indexer not initialized');
    }

    // Create operation context
    const operationContext: OperationContext = {
      vault: {
        path: this.config.vaultPath
      },
      fs: this.fs,
      indexer: this.indexer,
      options: {
        dryRun: false, // Already handled by pipeline executor
        updateLinks: true,
        createBackup: true,
        continueOnError: false
      }
    };

    // Create the appropriate operation based on type
    let docOperation;
    try {
      switch (operation.type) {
        case 'move': {
          if (operation.destination === undefined || operation.destination === null || operation.destination === '') {
            throw new Error('Move operation requires destination');
          }
          // Build full target path by combining destination directory with filename
          const moveTargetPath = join(operation.destination as string, basename(doc.path));
          docOperation = this.operationRegistry.create('move', {
            targetPath: moveTargetPath
          });
          break;
        }

        case 'rename': {
          if (operation.newName === undefined || operation.newName === null) {
            throw new Error('Rename operation requires newName');
          }
          docOperation = this.operationRegistry.create('rename', {
            newName: operation.newName as string
          });
          break;
        }

        case 'updateFrontmatter': {
          if (operation.updates === undefined || operation.updates === null) {
            throw new Error('UpdateFrontmatter operation requires updates');
          }
          docOperation = this.operationRegistry.create('updateFrontmatter', {
            updates: operation.updates as Record<string, unknown>,
            mode: (operation.mode ?? 'merge') as 'merge' | 'replace'
          });
          break;
        }

        case 'delete':
          docOperation = this.operationRegistry.create('delete', {
            permanent: operation.permanent ?? false
          });
          break;

        default:
          throw new Error(`Unknown operation type: ${String(operation.type)}`);
      }
    } catch (error) {
      return {
        skipped: true,
        reason: error instanceof Error ? error.message : String(error)
      };
    }

    // Validate the operation
    const validation = await docOperation.validate(doc, operationContext);
    if (!validation.valid) {
      return {
        skipped: true,
        reason: validation.error ?? 'Validation failed'
      };
    }

    // Execute the operation
    const result: OperationResult = await docOperation.execute(doc, operationContext);
    
    if (!result.success) {
      throw new Error(result.error ?? 'Operation failed');
    }

    return {
      details: {
        document: result.document,
        backup: result.backup,
        dryRun: result.dryRun
      }
    };
  }

  private async previewOperation(
    doc: Document,
    operation: ScriptOperation
  ): Promise<OperationExecutionResult> {
    // Analysis operations don't have preview
    if (operation.type === 'analyze' || operation.type === 'transform' || operation.type === 'aggregate') {
      return { details: { preview: true, type: operation.type } };
    }

    // Initialize indexer if needed
    if (this.indexer === undefined) {
      throw new Error('Indexer not initialized');
    }

    // Create operation context
    const operationContext: OperationContext = {
      vault: {
        path: this.config.vaultPath
      },
      fs: this.fs,
      indexer: this.indexer,
      options: {
        dryRun: true, // Preview mode
        updateLinks: true,
        createBackup: true,
        continueOnError: false
      }
    };

    // Create the appropriate operation based on type
    let docOperation;
    try {
      switch (operation.type) {
        case 'move': {
          if (operation.destination === undefined || operation.destination === null || operation.destination === '') {
            throw new Error('Move operation requires destination');
          }
          // Build full target path by combining destination directory with filename
          const moveTargetPath = join(operation.destination as string, basename(doc.path));
          docOperation = this.operationRegistry.create('move', {
            targetPath: moveTargetPath
          });
          break;
        }

        case 'rename': {
          if (operation.newName === undefined || operation.newName === null) {
            throw new Error('Rename operation requires newName');
          }
          docOperation = this.operationRegistry.create('rename', {
            newName: operation.newName as string
          });
          break;
        }

        case 'updateFrontmatter': {
          if (operation.updates === undefined || operation.updates === null) {
            throw new Error('UpdateFrontmatter operation requires updates');
          }
          docOperation = this.operationRegistry.create('updateFrontmatter', {
            updates: operation.updates as Record<string, unknown>,
            mode: (operation.mode ?? 'merge') as 'merge' | 'replace'
          });
          break;
        }

        case 'delete':
          docOperation = this.operationRegistry.create('delete', {
            permanent: operation.permanent ?? false
          });
          break;

        default:
          throw new Error(`Unknown operation type: ${String(operation.type)}`);
      }
    } catch (error) {
      return {
        skipped: true,
        reason: error instanceof Error ? error.message : String(error)
      };
    }

    // Validate the operation
    const validation = await docOperation.validate(doc, operationContext);
    if (!validation.valid) {
      return {
        skipped: true,
        reason: validation.error ?? 'Validation failed'
      };
    }

    // Preview the operation
    const preview = await docOperation.preview(doc, operationContext);
    
    return {
      details: {
        preview: true,
        type: preview.type,
        source: preview.source,
        target: preview.target,
        changes: preview.changes
      }
    };
  }
  */

  /**
   * Execute a pipeline with analysis operations.
   * Analysis operations are always executed immediately (safe by nature).
   */
  private async executeAnalysisPipeline(
    pipeline: OperationPipeline,
    documents: Document[],
    startTime: Date
  ): Promise<ScriptExecutionResult & { analysisTable?: Table }> {
    // Run analysis operations
    const analysisResult = await this.analysisRunner.runAnalysis(
      documents,
      pipeline.operations,
      pipeline.output
    );

    // Output is now handled directly by analysis runner

    const endTime = new Date();
    
    // Return execution result for consistency with analysis table
    return {
      attempted: documents,
      succeeded: [{
        item: { path: 'analysis', content: '', metadata: { name: 'analysis', modified: new Date(), size: 0, frontmatter: {}, tags: [], links: [] } },
        operation: { type: 'analyze' },
        details: { 
          rowCount: analysisResult.table.numRows(),
          colCount: analysisResult.table.numCols()
        }
      }],
      failed: [],
      skipped: [],
      stats: {
        duration: endTime.getTime() - startTime.getTime(),
        startTime,
        endTime,
      },
      analysisTable: analysisResult.table,
    };
  }
}