import type { ColumnTable } from 'arquero';
type Table = ColumnTable;
import type {
  Document,
  ScriptExecutionResult,
  OperationPipeline,
  ScriptOperation,
} from '@mmt/entities';
import { AnalysisRunner } from './analysis-runner.js';
import { FilterEvaluator } from './filter-evaluator.js';
import { ResultFormatter } from './result-formatter.js';
import type { DocumentSelector } from './document-selector.js';

export interface ExecutorOptions {
  apiUrl: string;
  outputStream: NodeJS.WritableStream;
  documentSelector: DocumentSelector;
  vaultId?: string; // Optional vault ID, defaults to "TestVault" for tests
}

/**
 * Handles execution of operation pipelines.
 */
export class ScriptExecutor {
  private readonly apiUrl: string;
  private readonly output: NodeJS.WritableStream;
  private readonly analysisRunner: AnalysisRunner;
  private readonly filterEvaluator: FilterEvaluator;
  private readonly formatter: ResultFormatter;
  private readonly documentSelector: DocumentSelector;
  private readonly vaultId: string;

  constructor(options: ExecutorOptions) {
    this.apiUrl = options.apiUrl;
    this.output = options.outputStream;
    this.documentSelector = options.documentSelector;
    this.vaultId = options.vaultId ?? 'TestVault'; // Default for tests
    this.analysisRunner = new AnalysisRunner();
    this.filterEvaluator = new FilterEvaluator();
    this.formatter = new ResultFormatter();
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
      const selectedDocs = await this.documentSelector.selectDocuments(pipeline.select);
      let documents = selectedDocs;
      if (pipeline.filter) {
        // Apply declarative filters locally for analysis operations
        documents = this.filterEvaluator.applyFilters(selectedDocs, pipeline.filter);
      }
      return this.executeAnalysisPipeline(pipeline, documents, startTime);
    }

    // For non-analysis operations, call the API
    try {
      // API now handles declarative filters directly
      const pipelineToSend = pipeline;

      // Call the API with vault ID in path
      const apiUrl = `${this.apiUrl}/api/vaults/${this.vaultId}/pipelines/execute`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pipelineToSend),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${String(response.status)} - ${error}`);
      }

      const apiResponse = await response.json();
      
      // Check if this is a preview response
      const isPreview = !pipeline.options?.destructive;
      
      let apiResult: {
        success: boolean;
        documentsProcessed: number;
        operations: {
          succeeded: number;
          failed: number;
          skipped: number;
        };
        results?: {
          succeeded: {
            document: Document;
            operation: ScriptOperation;
            details: unknown;
          }[];
          failed: {
            document: Document;
            operation: ScriptOperation;
            error: string;
          }[];
          skipped: {
            document: Document;
            operation: ScriptOperation;
            reason: string;
          }[];
        };
        errors?: {
          document: string;
          operation: string;
          error: string;
        }[];
      };
      
      interface PreviewResponse {
        preview?: unknown;
        documents?: Document[];
      }

      if (isPreview && typeof apiResponse === 'object' && apiResponse !== null && 'preview' in apiResponse) {
        // Convert preview response to execution result format
        const previewResponse = apiResponse as PreviewResponse;
        const documents = previewResponse.documents ?? [];
        const {operations} = pipeline;
        
        // In preview mode, all operations are skipped
        const skippedResults = [];
        for (const doc of documents) {
          for (const op of operations) {
            skippedResults.push({
              document: doc,
              operation: op,
              reason: 'Preview mode'
            });
          }
        }
        
        apiResult = {
          success: true,
          documentsProcessed: documents.length,
          operations: {
            succeeded: 0,
            failed: 0,
            skipped: skippedResults.length
          },
          results: {
            succeeded: [],
            failed: [],
            skipped: skippedResults
          }
        };
      } else {
        // Regular execution result
        apiResult = apiResponse as typeof apiResult;
      }

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
            ...(r.details ?? {}),
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
      this.formatOutput(result, pipeline);

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

  /**
   * Format and output execution results.
   */
  private formatOutput(result: ScriptExecutionResult, pipeline: OperationPipeline): void {
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
  }
}