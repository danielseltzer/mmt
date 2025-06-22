import type { ScriptExecutionResult, OperationPipeline, OutputConfig } from '@mmt/entities';
import type { Table } from 'arquero';
import { writeFile } from 'fs/promises';
import { dirname } from 'path';
import { mkdir } from 'fs/promises';

export interface ReportGenerationOptions {
  scriptPath: string;
  vaultPath: string;
  executionResult: ScriptExecutionResult;
  pipeline: OperationPipeline;
  analysisTable?: Table;
  reportPath: string;
  isPreview: boolean;
}

/**
 * Generates markdown reports from script execution results
 */
export class MarkdownReportGenerator {
  /**
   * Generate a markdown report from script execution
   */
  async generateReport(options: ReportGenerationOptions): Promise<void> {
    const report = this.buildReport(options);
    
    // Ensure directory exists
    await mkdir(dirname(options.reportPath), { recursive: true });
    
    // Write report
    await writeFile(options.reportPath, report, 'utf-8');
    console.log(`✓ Generated markdown report: ${options.reportPath}`);
  }
  
  /**
   * Build the markdown report content
   */
  private buildReport(options: ReportGenerationOptions): string {
    const {
      scriptPath,
      vaultPath,
      executionResult,
      pipeline,
      analysisTable,
      isPreview
    } = options;
    
    const sections: string[] = [];
    
    // Header
    sections.push(this.buildHeader(scriptPath, vaultPath));
    
    // Execution summary
    sections.push(this.buildExecutionSummary(executionResult, isPreview));
    
    // Pipeline details
    sections.push(this.buildPipelineDetails(pipeline));
    
    // Results section
    if (analysisTable) {
      sections.push(this.buildAnalysisResults(analysisTable, pipeline.output));
    } else if (executionResult.succeeded.length > 0 || executionResult.failed.length > 0) {
      sections.push(this.buildMutationResults(executionResult));
    }
    
    // Footer with metadata
    sections.push(this.buildFooter(executionResult));
    
    return sections.join('\n\n');
  }
  
  private buildHeader(scriptPath: string, vaultPath: string): string {
    const scriptName = scriptPath.split('/').pop() || scriptPath;
    return `# MMT Script Execution Report

**Script**: \`${scriptName}\`  
**Vault**: \`${vaultPath}\`  
**Generated**: ${new Date().toLocaleString()}

---`;
  }
  
  private buildExecutionSummary(result: ScriptExecutionResult, isPreview: boolean): string {
    const mode = isPreview ? '🔍 PREVIEW MODE' : '✅ EXECUTED';
    const duration = result.stats.duration;
    
    return `## Execution Summary

**Mode**: ${mode}  
**Duration**: ${duration}ms  
**Documents Processed**: ${result.attempted.length}  
**Successful Operations**: ${result.succeeded.length}  
**Failed Operations**: ${result.failed.length}  
**Skipped Operations**: ${result.skipped.length}`;
  }
  
  private buildPipelineDetails(pipeline: OperationPipeline): string {
    const lines = ['## Pipeline Configuration'];
    
    // Selection criteria
    lines.push('\n### Selection Criteria');
    const criteria = pipeline.select;
    if ('files' in criteria && criteria.files) {
      lines.push(`- **Files**: ${criteria.files.length} explicit files`);
    } else {
      const conditions = Object.entries(criteria);
      if (conditions.length === 0) {
        lines.push('- All documents in vault');
      } else {
        conditions.forEach(([key, value]) => {
          lines.push(`- **${key}**: ${value}`);
        });
      }
    }
    
    // Operations
    lines.push('\n### Operations');
    pipeline.operations.forEach((op, i) => {
      lines.push(`${i + 1}. **${op.type}** operation`);
      if ('action' in op) {
        lines.push(`   - Action: ${op.action}`);
      }
    });
    
    // Output configuration
    if (pipeline.output) {
      lines.push('\n### Output Configuration');
      pipeline.output.forEach((output) => {
        lines.push(`- **${output.format}** → ${output.destination}`);
        if (output.path) {
          lines.push(`  - Path: ${output.path}`);
        }
        if (output.fields) {
          lines.push(`  - Fields: ${output.fields.join(', ')}`);
        }
      });
    }
    
    return lines.join('\n');
  }
  
  private buildAnalysisResults(table: Table, outputs?: OutputConfig): string {
    const lines = ['## Analysis Results'];
    
    // Table stats
    lines.push(`\n**Result Set**: ${table.numRows()} rows × ${table.numCols()} columns`);
    
    // Sample data (first 10 rows)
    lines.push('\n### Sample Data (First 10 Rows)');
    const sample = (table as any).slice(0, 10);
    lines.push(this.tableToMarkdown(sample));
    
    // Column statistics
    lines.push('\n### Column Summary');
    const columns = table.columnNames();
    lines.push('| Column | Type | Non-null Count |');
    lines.push('|--------|------|----------------|');
    columns.forEach((col: string) => {
      const type = this.inferColumnType(table, col);
      const nonNullCount = (table as any).filter(`d => d['${col}'] != null`).numRows();
      lines.push(`| ${col} | ${type} | ${nonNullCount} |`);
    });
    
    return lines.join('\n');
  }
  
  private buildMutationResults(result: ScriptExecutionResult): string {
    const lines = ['## Operation Results'];
    
    if (result.succeeded.length > 0) {
      lines.push('\n### Successful Operations');
      lines.push(`Total: ${result.succeeded.length}`);
      
      // Sample of successful operations
      const successSample = result.succeeded.slice(0, 5);
      successSample.forEach(success => {
        lines.push(`- ✓ ${success.operation.type} on ${success.item.path || 'item'}`);
      });
      if (result.succeeded.length > 5) {
        lines.push(`- ... and ${result.succeeded.length - 5} more`);
      }
    }
    
    if (result.failed.length > 0) {
      lines.push('\n### Failed Operations');
      lines.push(`Total: ${result.failed.length}`);
      
      result.failed.forEach(failure => {
        lines.push(`- ❌ ${failure.operation.type} on ${failure.item.path || 'item'}`);
        lines.push(`  - Error: ${failure.error.message}`);
      });
    }
    
    if (result.skipped.length > 0) {
      lines.push('\n### Skipped Operations');
      lines.push(`Total: ${result.skipped.length}`);
      
      const skipSample = result.skipped.slice(0, 5);
      skipSample.forEach(skip => {
        lines.push(`- ⏭️ ${skip.operation.type} on ${skip.item.path || 'item'}: ${skip.reason}`);
      });
      if (result.skipped.length > 5) {
        lines.push(`- ... and ${result.skipped.length - 5} more`);
      }
    }
    
    return lines.join('\n');
  }
  
  private buildFooter(result: ScriptExecutionResult): string {
    return `---

## Metadata

- **Start Time**: ${result.stats.startTime.toISOString()}
- **End Time**: ${result.stats.endTime.toISOString()}
- **Total Duration**: ${result.stats.duration}ms
- **Report Generated By**: MMT Scripting Engine

_This report was automatically generated. For questions or issues, please refer to the MMT documentation._`;
  }
  
  /**
   * Convert Arquero table to markdown table format
   */
  private tableToMarkdown(table: Table): string {
    const rows = (table as any).objects();
    if (rows.length === 0) return '_No data_';
    
    const headers = Object.keys(rows[0]);
    const lines: string[] = [];
    
    // Header
    lines.push('| ' + headers.join(' | ') + ' |');
    lines.push('|' + headers.map(() => '---').join('|') + '|');
    
    // Rows
    rows.forEach((row: any) => {
      const values = headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.length > 50) {
          return val.substring(0, 47) + '...';
        }
        return String(val);
      });
      lines.push('| ' + values.join(' | ') + ' |');
    });
    
    return lines.join('\n');
  }
  
  /**
   * Infer column type from sample values
   */
  private inferColumnType(table: Table, column: string): string {
    const sample = (table as any).sample(Math.min(100, table.numRows()));
    const values = (sample as any).array(column);
    
    let hasString = false;
    let hasNumber = false;
    let hasDate = false;
    
    for (const val of values) {
      if (val === null || val === undefined) continue;
      
      const type = typeof val;
      if (type === 'string') {
        hasString = true;
        // Check if it's a date string
        if (!isNaN(Date.parse(val))) {
          hasDate = true;
        }
      } else if (type === 'number') {
        hasNumber = true;
      } else if (val instanceof Date) {
        hasDate = true;
      }
    }
    
    if (hasDate && !hasNumber) return 'date';
    if (hasNumber && !hasString) return 'number';
    return 'string';
  }
}