import type { Context } from '../context.js';
import type {
  OperationPipeline,
  Document,
  SelectCriteria,
  ScriptOperation,
  FilterCollection,
  FilterCondition,
  PipelinePreviewResponse
} from '@mmt/entities';
import { OperationRegistry } from '@mmt/document-operations';
import type { OperationContext } from '@mmt/document-operations';
import { basename, join } from 'path';
import { PreviewGenerator } from './preview-generator.js';
import { Loggers, type Logger } from '@mmt/logger';
import { DocumentSelector } from './document-selector.js';
import { FilterExecutor } from './filter-executor.js';

export interface PipelineExecutionResult {
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
  output?: any;
}

/**
 * PipelineExecutor handles execution of operation pipelines.
 * 
 * Currently supports mutation operations:
 * - move: Move documents to a new location
 * - rename: Rename documents
 * - updateFrontmatter: Update document frontmatter
 * - delete: Delete documents (with optional permanent flag)
 * 
 * Note: Filter functions are handled client-side by the script-runner.
 * The API receives pre-filtered file lists instead of filter functions,
 * as JavaScript functions cannot be serialized over HTTP.
 * 
 * Future: Analysis operations (analyze, transform, aggregate) - see issue #22
 */
export class PipelineExecutor {
  private readonly context: Context;
  private readonly operationRegistry: OperationRegistry;
  private readonly previewGenerator: PreviewGenerator;
  private readonly documentSelector: DocumentSelector;
  private readonly logger: Logger = Loggers.api();

  constructor(context: Context) {
    this.context = context;
    this.operationRegistry = new OperationRegistry();
    this.previewGenerator = new PreviewGenerator();
    this.documentSelector = new DocumentSelector(this.logger);
  }

  async execute(pipeline: OperationPipeline): Promise<PipelineExecutionResult | PipelinePreviewResponse> {
    // If in preview mode, generate and return preview
    const isPreview = !pipeline.options?.destructive;
    if (isPreview) {
      return this.generatePreview(pipeline);
    }
    
    // Otherwise, execute the pipeline
    return this.executePipeline(pipeline);
  }

  private async generatePreview(pipeline: OperationPipeline): Promise<PipelinePreviewResponse> {
    // SELECT phase - get documents based on criteria
    let documents = await this.selectDocuments(pipeline.select);
    
    // FILTER phase - apply declarative filters if present
    if (pipeline.filter) {
      documents = this.applyFilters(documents, pipeline.filter);
    }
    
    // Generate preview
    return this.previewGenerator.generatePreview(
      documents,
      pipeline.operations,
      pipeline.filter
    );
  }

  private async executePipeline(pipeline: OperationPipeline): Promise<PipelineExecutionResult> {
    const errors: PipelineExecutionResult['errors'] = [];
    const results: NonNullable<PipelineExecutionResult['results']> = {
      succeeded: [],
      failed: [],
      skipped: []
    };
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    try {
      // SELECT phase - get documents based on criteria
      let documents = await this.selectDocuments(pipeline.select);
      // FILTER phase - apply declarative filters if present
      if (pipeline.filter) {
        documents = this.applyFilters(documents, pipeline.filter);
      }
      
      // TRANSFORM phase - apply operations to documents
      for (const doc of documents) {
        for (const operation of pipeline.operations) {
          try {
            // Execute mode - actually perform operations
            await this.executeOperation(doc, operation);
            succeeded++;
            results.succeeded.push({
              document: doc,
              operation,
              details: {
                type: operation.type,
                source: doc.path,
                target: this.getOperationTarget(doc, operation)
              }
            });
          } catch (error) {
            failed++;
            const errorMsg = error instanceof Error ? error.message : String(error);
            errors.push({
              document: doc.path,
              operation: operation.type,
              error: errorMsg
            });
            results.failed.push({
              document: doc,
              operation,
              error: errorMsg
            });
            
            if (!pipeline.options?.continueOnError) {
              break;
            }
          }
        }
        
        if (!pipeline.options?.continueOnError && failed > 0) {
          break;
        }
      }

      // OUTPUT phase - format results based on output config
      const output = await this.formatOutput(documents, pipeline.output);

      return {
        success: failed === 0,
        documentsProcessed: documents.length,
        operations: {
          succeeded,
          failed,
          skipped
        },
        results,
        errors: errors.length > 0 ? errors : undefined,
        output
      };
    } catch (error) {
      return {
        success: false,
        documentsProcessed: 0,
        operations: { succeeded: 0, failed: 1, skipped: 0 },
        errors: [{
          document: '',
          operation: 'pipeline',
          error: error instanceof Error ? error.message : String(error)
        }]
      };
    }
  }

  private async selectDocuments(criteria: SelectCriteria): Promise<Document[]> {
    // Handle select all case
    if ('all' in criteria && criteria.all === true) {
      const allDocs = this.context.indexer.getAllDocuments();
      return await this.convertMetadataToDocuments(allDocs);
    }
    
    // Handle explicit file list
    if ('files' in criteria && criteria.files) {
      const docs: Document[] = [];
      for (const filePath of criteria.files) {
        if (typeof filePath !== 'string') continue;
        
        // Check if filePath is already absolute
        const defaultVault = this.context.config.vaults[0];
        const fullPath = filePath.startsWith('/') || (process.platform === 'win32' && /^[A-Za-z]:[\\/]/u.test(filePath)) 
          ? filePath 
          : join(defaultVault.path, filePath);
        const exists = await this.context.fs.exists(fullPath);
        
        if (exists) {
          // Try to get the document from the indexer first (which has frontmatter)
          const allDocs = this.context.indexer.getAllDocuments();
          const indexedDoc = allDocs.find(d => d.path === fullPath);
          
          if (indexedDoc) {
            // Convert indexed document to Document format
            const convertedDocs = await this.convertMetadataToDocuments([indexedDoc]);
            if (convertedDocs.length > 0) {
              docs.push(convertedDocs[0]);
              continue;
            }
          }
          
          // Fallback to manual creation if not in index
          const stats = await this.context.fs.stat(fullPath);
          const fileName = filePath.replace(/\.md$/u, '').split('/').pop() ?? filePath;
          
          docs.push({
            path: fullPath,
            content: '',
            metadata: {
              name: fileName,
              modified: stats.mtime,
              size: stats.size,
              frontmatter: {},
              tags: [],
              links: []
            }
          });
        }
      }
      return docs;
    }

    // Query-based selection using indexer
    const query = Object.entries(criteria as Record<string, unknown>)
      .filter(([key]) => key !== 'files')
      .reduce<Record<string, unknown>>((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    if (Object.keys(query).length === 0) {
      // No criteria - return all documents
      const allDocs = this.context.indexer.getAllDocuments();
      return await this.convertMetadataToDocuments(allDocs);
    }

    // Build and execute query
    const indexerQuery = this.buildIndexerQuery(query);
    const results = this.context.indexer.query(indexerQuery);
    return await this.convertMetadataToDocuments(results);
  }

  private buildIndexerQuery(criteria: Record<string, unknown>): any {
    const conditions: any[] = [];

    for (const [field, value] of Object.entries(criteria)) {
      let operator = 'equals';
      if (typeof value === 'string' && value.includes('*')) {
        operator = 'matches';
      }

      conditions.push({ field, operator, value });
    }

    return { conditions };
  }

  private async convertMetadataToDocuments(metadata: any[]): Promise<Document[]> {
    const documents: Document[] = [];
    
    for (const meta of metadata) {
      const outgoingLinks = this.context.indexer.getOutgoingLinks(meta.relativePath);
      const incomingLinks = this.context.indexer.getBacklinks(meta.relativePath);
      
      // Load content for filtering
      const content = await this.context.fs.readFile(meta.path, 'utf-8');
      
      documents.push({
        path: meta.path,
        content,
        metadata: {
          name: meta.basename,
          modified: new Date(meta.mtime),
          size: meta.size,
          frontmatter: meta.frontmatter,
          tags: meta.tags,
          links: outgoingLinks.map(targetDoc => targetDoc.relativePath),
          backlinks: incomingLinks.map(sourceDoc => sourceDoc.relativePath)
        }
      });
    }
    
    return documents;
  }

  private async validateOperation(doc: Document, operation: ScriptOperation): Promise<void> {
    const operationContext = this.createOperationContext();
    const docOperation = this.createDocumentOperation(operation, doc);
    
    const validation = await docOperation.validate(doc, operationContext);
    if (!validation.valid) {
      throw new Error(validation.error ?? 'Operation validation failed');
    }
  }

  private async executeOperation(doc: Document, operation: ScriptOperation): Promise<void> {
    const operationContext = this.createOperationContext();
    const docOperation = this.createDocumentOperation(operation, doc);
    
    const result = await docOperation.execute(doc, operationContext);
    if (!result.success) {
      throw new Error(result.error ?? 'Operation failed');
    }
  }

  private createOperationContext(): OperationContext {
    const defaultVault = this.context.config.vaults[0];
    return {
      vault: { path: defaultVault.path },
      fs: this.context.fs,
      indexer: this.context.indexer,
      options: {
        dryRun: false,
        updateLinks: true,
        createBackup: true,
        continueOnError: false
      }
    };
  }

  private createDocumentOperation(operation: ScriptOperation, doc: Document): any {
    switch (operation.type) {
      case 'move': {
        if (!operation.destination) {
          throw new Error('Move operation requires destination');
        }
        // Build full target path by combining destination directory with filename
        const targetPath = join(operation.destination as string, basename(doc.path));
        return this.operationRegistry.create('move', { targetPath });
      }

      case 'rename': {
        if (!operation.newName) {
          throw new Error('Rename operation requires newName');
        }
        return this.operationRegistry.create('rename', { newName: operation.newName as string });
      }

      case 'updateFrontmatter': {
        if (!operation.updates) {
          throw new Error('UpdateFrontmatter operation requires updates');
        }
        return this.operationRegistry.create('updateFrontmatter', {
          updates: operation.updates as Record<string, unknown>,
          mode: (operation.mode ?? 'merge') as 'merge' | 'replace'
        });
      }

      case 'delete':
        return this.operationRegistry.create('delete', {
          permanent: operation.permanent ?? false
        });

      // Analysis operations - not yet implemented
      // TODO: Implement analysis operations (see issue #22)
      case 'analyze':
      case 'transform':
      case 'aggregate':
        throw new Error(`Analysis operation '${operation.type}' not yet implemented. These operations will be added in a future release.`);

      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private getOperationTarget(doc: Document, operation: ScriptOperation): string | undefined {
    switch (operation.type) {
      case 'move':
        return operation.destination ? join(operation.destination as string, basename(doc.path)) : undefined;
      case 'rename':
        return operation.newName as string;
      case 'updateFrontmatter':
        return doc.path; // Same file
      case 'delete':
        return operation.permanent ? 'permanent deletion' : '.trash';
      default:
        return undefined;
    }
  }

  private async formatOutput(documents: Document[], outputConfig?: any): Promise<any> {
    if (!outputConfig || outputConfig.length === 0) {
      return undefined;
    }

    // For now, just return document paths
    // This will be expanded to support different output formats
    return {
      documents: documents.map(d => d.path)
    };
  }

  private applyFilters(documents: Document[], filterCollection: FilterCollection): Document[] {
    return documents.filter(doc => {
      const results = filterCollection.conditions.map(condition => 
        this.evaluateFilter(doc, condition)
      );
      
      // Apply logic (AND/OR)
      if (filterCollection.logic === 'OR') {
        return results.some(r => r);
      } else {
        // Default to AND
        return results.every(r => r);
      }
    });
  }

  // Filter evaluation moved to FilterExecutor class

  // Text, array, and date evaluation methods moved to FilterExecutor class

  // Date and number evaluation methods moved to FilterExecutor class
}