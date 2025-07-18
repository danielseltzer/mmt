import type { Context } from '../context.js';
import type {
  OperationPipeline,
  Document,
  SelectCriteria,
  ScriptOperation
} from '@mmt/entities';
import { OperationRegistry } from '@mmt/document-operations';
import type { OperationContext } from '@mmt/document-operations';
import { basename, join } from 'path';

export interface PipelineExecutionResult {
  success: boolean;
  documentsProcessed: number;
  operations: {
    succeeded: number;
    failed: number;
    skipped: number;
  };
  errors?: Array<{
    document: string;
    operation: string;
    error: string;
  }>;
  output?: any;
}

export class PipelineExecutor {
  private readonly context: Context;
  private readonly operationRegistry: OperationRegistry;

  constructor(context: Context) {
    this.context = context;
    this.operationRegistry = new OperationRegistry();
  }

  async execute(pipeline: OperationPipeline): Promise<PipelineExecutionResult> {
    const errors: PipelineExecutionResult['errors'] = [];
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    try {
      // SELECT phase - get documents based on criteria
      const documents = await this.selectDocuments(pipeline.select);
      
      // TRANSFORM phase - apply operations to documents
      const isPreview = !pipeline.options?.destructive;
      
      for (const doc of documents) {
        for (const operation of pipeline.operations) {
          try {
            if (isPreview) {
              // Preview mode - just validate operations
              await this.validateOperation(doc, operation);
              skipped++;
            } else {
              // Execute mode - actually perform operations
              await this.executeOperation(doc, operation);
              succeeded++;
            }
          } catch (error) {
            failed++;
            errors.push({
              document: doc.path,
              operation: operation.type,
              error: error instanceof Error ? error.message : String(error)
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
    // Handle explicit file list
    if ('files' in criteria && criteria.files) {
      const docs: Document[] = [];
      for (const filePath of criteria.files) {
        if (typeof filePath !== 'string') continue;
        
        const fullPath = join(this.context.config.vaultPath, filePath);
        const exists = await this.context.fs.exists(fullPath);
        
        if (exists) {
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
      return this.convertMetadataToDocuments(allDocs);
    }

    // Build and execute query
    const indexerQuery = this.buildIndexerQuery(query);
    const results = this.context.indexer.query(indexerQuery);
    return this.convertMetadataToDocuments(results);
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

  private convertMetadataToDocuments(metadata: any[]): Document[] {
    const documents: Document[] = [];
    
    for (const meta of metadata) {
      const outgoingLinks = this.context.indexer.getOutgoingLinks(meta.relativePath);
      const incomingLinks = this.context.indexer.getBacklinks(meta.relativePath);
      
      documents.push({
        path: meta.path,
        content: '',
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
    return {
      vault: { path: this.context.config.vaultPath },
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

      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
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
}