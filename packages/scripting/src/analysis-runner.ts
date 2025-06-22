import type { Table } from 'arquero';
import type {
  Document,
  ScriptOperation,
  OperationReadyDocumentSet,
  OutputConfig,
  OutputSpec,
  ToDocumentSetOptions,
} from '@mmt/entities';
import { documentsToTable, tableToDocumentSet } from './analysis-pipeline.js';
import * as aq from 'arquero';
import { ResultFormatter } from './result-formatter.js';
import { writeFile } from 'fs/promises';
import { dirname } from 'path';
import { mkdir } from 'fs/promises';

export interface AnalysisContext {
  table: Table;
  aq: typeof aq;
}

export interface AnalysisResult {
  table: Table;
  documentSet?: OperationReadyDocumentSet;
  output?: string;
}

/**
 * Executes analysis operations on a collection of documents.
 * Analysis operations are always safe and don't require destructive flag.
 */
export class AnalysisRunner {
  private formatter: ResultFormatter;
  
  constructor() {
    this.formatter = new ResultFormatter();
  }
  
  /**
   * Run analysis operations on documents.
   */
  async runAnalysis(
    documents: Document[],
    operations: ScriptOperation[],
    outputConfig?: OutputConfig
  ): Promise<AnalysisResult> {
    console.log('runAnalysis called with', documents.length, 'documents');
    // Convert documents to Arquero table
    let table = documentsToTable(documents);
    console.log('Table created with', table.numRows(), 'rows');
    
    // Execute each analysis operation
    for (const operation of operations) {
      if (operation.type === 'analyze' || operation.type === 'transform' || operation.type === 'aggregate') {
        table = await this.executeAnalysisOperation(table, operation);
      } else if (operation.type === 'custom' && 'action' in operation && operation.action === 'analyze' && 'handler' in operation) {
        // Support legacy custom operations with handlers
        const context: AnalysisContext = { table, aq };
        const handler = (operation as any).handler;
        const result = await handler(documents, context);
        if (result && result.table) {
          table = result.table;
        }
      }
    }
    
    // Process outputs if requested
    if (outputConfig) {
      await this.processOutputs(table, outputConfig);
    }
    
    return {
      table,
      output: undefined, // Legacy field, kept for compatibility
    };
  }
  
  /**
   * Execute a single analysis operation.
   */
  private async executeAnalysisOperation(
    table: Table,
    operation: ScriptOperation
  ): Promise<Table> {
    // Check if operation has a transform function
    if ('transform' in operation && typeof operation.transform === 'function') {
      // Apply the transformation
      return operation.transform(table);
    }
    
    // Check for built-in analysis operations
    if ('action' in operation) {
      switch (operation.action) {
        case 'groupBy':
          if ('field' in operation && typeof operation.field === 'string') {
            return (table as any).groupby(operation.field);
          }
          break;
          
        case 'count':
          return (table as any).count();
          
        case 'distinct':
          if ('field' in operation && typeof operation.field === 'string') {
            return (table as any).dedupe(operation.field);
          }
          break;
      }
    }
    
    throw new Error(`Unknown analysis operation: ${JSON.stringify(operation)}`);
  }
  
  /**
   * Convert analysis results to document set if needed.
   */
  async toDocumentSet(
    analysisResult: AnalysisResult,
    options: Partial<ToDocumentSetOptions> = {}
  ): Promise<OperationReadyDocumentSet> {
    return tableToDocumentSet(analysisResult.table, options);
  }
  
  /**
   * Process multiple outputs according to configuration.
   */
  private async processOutputs(table: Table, config: OutputConfig): Promise<void> {
    // Handle the config which might be in various formats
    let outputs: OutputSpec[];
    
    if (Array.isArray(config)) {
      outputs = config;
    } else if (typeof config === 'string') {
      outputs = [{ format: config as any, destination: 'console' }];
    } else {
      outputs = [{ ...(config as any), destination: 'console' }];
    }
    
    for (const output of outputs) {
      const formatted = this.formatOutput(table, output);
      
      if (output.destination === 'console') {
        console.log(formatted);
      } else if (output.destination === 'file' && output.path) {
        // Ensure directory exists
        await mkdir(dirname(output.path), { recursive: true });
        await writeFile(output.path, formatted, 'utf-8');
        console.log(`✓ Wrote ${output.format} output to: ${output.path}`);
      }
    }
  }
  
  /**
   * Format output according to specification.
   */
  private formatOutput(table: Table, spec: OutputSpec): string {
    switch (spec.format) {
      case 'csv':
        return this.formatAsCSV(table, spec.fields);
        
      case 'json':
        return this.formatAsJSON(table, spec.fields);
        
      case 'table':
      case 'detailed':
        return this.formatAsTable(table, spec.fields);
        
      case 'summary':
      default:
        return this.formatAsSummary(table);
    }
  }
  
  private formatAsCSV(table: Table, fields?: string[]): string {
    const data = fields ? (table as any).select(fields) : table;
    return (data as any).toCSV();
  }
  
  private formatAsJSON(table: Table, fields?: string[]): string {
    const data = fields ? (table as any).select(fields) : table;
    return JSON.stringify((data as any).objects(), null, 2);
  }
  
  private formatAsTable(table: Table, fields?: string[]): string {
    const data = fields ? (table as any).select(fields) : table;
    // Simple ASCII table format
    const rows = (data as any).objects();
    if (rows.length === 0) return 'No results';
    
    const headers = Object.keys(rows[0]);
    const widths = headers.map((h: string) => Math.max(h.length, ...rows.map((r: any) => String(r[h] || '').length)));
    
    // Header
    let output = headers.map((h, i) => h.padEnd(widths[i])).join(' | ') + '\n';
    output += widths.map(w => '-'.repeat(w)).join('-|-') + '\n';
    
    // Rows
    for (const row of rows) {
      output += headers.map((h, i) => String(row[h] || '').padEnd(widths[i])).join(' | ') + '\n';
    }
    
    return output;
  }
  
  private formatAsSummary(table: Table): string {
    return `Analysis complete: ${table.numRows()} rows, ${table.numCols()} columns`;
  }
}