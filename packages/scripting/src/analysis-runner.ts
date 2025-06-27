import type {
  Document,
  ScriptOperation,
  OperationReadyDocumentSet,
  OutputConfig,
  OutputSpec,
  ToDocumentSetOptions,
} from '@mmt/entities';
import { fromDocuments, fromTable } from '@mmt/document-set';
import * as aq from 'arquero';

// Import Table type from arquero
import type { Table } from 'arquero';
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
    // Create DocumentSet from documents
    const docSet = await fromDocuments(documents, { overrideLimit: true });
    let table = docSet.tableRef;
    
    // Execute each analysis operation
    for (const operation of operations) {
      if (operation.type === 'analyze' || operation.type === 'transform' || operation.type === 'aggregate') {
        table = this.executeAnalysisOperation(table, operation);
      }
    }
    
    // Process outputs if requested
    if (outputConfig) {
      await this.processOutputs(table, outputConfig);
    }
    
    return {
      table,
    };
  }
  
  /**
   * Execute a single analysis operation.
   */
  private executeAnalysisOperation(
    table: Table,
    operation: ScriptOperation
  ): Table {
    // Check if operation has a transform function
    if ('transform' in operation && typeof operation.transform === 'function') {
      // Apply the transformation
      const transform = operation.transform as (table: Table) => Table;
      return transform(table);
    }
    
    // Check for built-in analysis operations
    if ('action' in operation) {
      switch (operation.action) {
        case 'groupBy':
          if ('field' in operation && typeof operation.field === 'string') {
            return table.groupby(operation.field);
          }
          break;
          
        case 'count':
          return table.count();
          
        case 'distinct':
          if ('field' in operation && typeof operation.field === 'string') {
            return table.dedupe(operation.field);
          }
          break;
          
        default:
          // Unknown action
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
    return fromTable(analysisResult.table, options);
  }
  
  /**
   * Process multiple outputs according to configuration.
   */
  private async processOutputs(table: Table, config: OutputConfig): Promise<void> {
    // Config is always an array of OutputSpec
    const outputs = config;
    
    for (const output of outputs) {
      const formatted = this.formatOutput(table, output);
      
      if (output.destination === 'console') {
        // Output to console is handled by the formatter
      } else if (output.path !== undefined) {
        // Ensure directory exists
        await mkdir(dirname(output.path), { recursive: true });
        await writeFile(output.path, formatted, 'utf-8');
        // Log output written
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
    const data = fields ? table.select(...fields) : table;
    return data.toCSV();
  }
  
  private formatAsJSON(table: Table, fields?: string[]): string {
    const data = fields ? table.select(...fields) : table;
    return JSON.stringify(data.objects(), null, 2);
  }
  
  private formatAsTable(table: Table, fields?: string[]): string {
    const data = fields ? table.select(...fields) : table;
    // Simple ASCII table format
    const rows = data.objects();
    if (rows.length === 0) {return 'No results';}
    
    const headers = Object.keys(rows[0] as Record<string, unknown>);
    const widths = headers.map((h: string) => Math.max(h.length, ...rows.map((r) => {
      const val = (r as Record<string, unknown>)[h];
      if (val === null || val === undefined) {
        return 0;
      }
      if (typeof val === 'object') {
        return JSON.stringify(val).length;
      }
      return String(val as string | number | boolean).length;
    })));
    
    // Header
    let output = `${headers.map((h, i) => h.padEnd(widths[i])).join(' | ') }\n`;
    output += `${widths.map(w => '-'.repeat(w)).join('-|-') }\n`;
    
    // Rows
    for (const row of rows) {
      output += `${headers.map((h, i) => {
        const val = (row as Record<string, unknown>)[h];
        if (val === null || val === undefined) {
          return ''.padEnd(widths[i]);
        }
        if (typeof val === 'object') {
          return JSON.stringify(val).padEnd(widths[i]);
        }
        return String(val as string | number | boolean).padEnd(widths[i]);
      }).join(' | ') }\n`;
    }
    
    return output;
  }
  
  private formatAsSummary(table: Table): string {
    return `Analysis complete: ${table.numRows().toString()} rows, ${table.numCols().toString()} columns`;
  }
}