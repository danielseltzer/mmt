import type { ScriptExecutionResult, OperationPipeline, OutputConfig, AgentAnalysis } from '@mmt/entities';
import type { Table } from 'arquero';
import { writeFile, unlink } from 'fs/promises';
import { dirname, basename } from 'path';
import { mkdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';

export interface ReportGenerationOptions {
  scriptPath: string;
  vaultPath: string;
  executionResult: ScriptExecutionResult;
  pipeline: OperationPipeline;
  analysisTable?: Table;
  reportPath: string;
  isPreview: boolean;
}

const execAsync = promisify(exec);

// Default prompt template based on ADR-010 decision
const DEFAULT_PROMPT_TEMPLATE = `I have a markdown report from analyzing [ANALYSIS_TYPE] in my personal knowledge vault. Please provide a concise summary (2-3 sentences) identifying the critical insights about my knowledge organization patterns and note-taking habits.

Focus on:
1. What the [KEY_METRIC] reveal about recurring themes or knowledge hubs
2. What the [PATTERNS] suggest about how I organize and connect information
3. Any notable patterns in the ratio of documents to connections

Here's the report:

[REPORT CONTENT]`;

/**
 * Generates markdown reports from script execution results
 */
export class MarkdownReportGenerator {
  /**
   * Generate a markdown report from script execution
   */
  async generateReport(options: ReportGenerationOptions): Promise<void> {
    let report = this.buildReport(options);
    
    // Check if agent analysis is requested
    const agentConfig = options.pipeline.agentAnalysis;
    if (agentConfig?.enabled !== false) { // Default to enabled if present
      const analysis = await this.generateAgentAnalysis(report, options, agentConfig);
      if (analysis) {
        report = this.appendAgentAnalysis(report, analysis);
      }
    }
    
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
  
  /**
   * Generate AI-powered analysis of the report
   */
  private async generateAgentAnalysis(
    report: string, 
    options: ReportGenerationOptions,
    agentConfig?: AgentAnalysis
  ): Promise<{ content: string; duration: number } | null> {
    const startTime = Date.now();
    
    // Create temporary file for the prompt
    const tempFile = join(tmpdir(), `mmt-prompt-${Date.now()}.txt`);
    
    try {
      const prompt = this.buildPrompt(report, options, agentConfig);
      const model = agentConfig?.model || 'sonnet';
      const timeout = agentConfig?.timeout || 30000;
      
      // Write prompt to temporary file
      await writeFile(tempFile, prompt, 'utf-8');
      
      // Execute claude with --print flag using file input
      const { stdout, stderr } = await execAsync(
        `claude --print --model ${model} < "${tempFile}"`,
        { 
          timeout,
          shell: '/bin/bash'
        }
      );
      
      if (stderr) {
        console.warn('Claude analysis warning:', stderr);
      }
      
      const duration = Date.now() - startTime;
      return { content: stdout.trim(), duration };
    } catch (error) {
      console.error('Failed to generate agent analysis:', error);
      return null;
    } finally {
      // Clean up temp file
      try {
        await unlink(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
  
  /**
   * Build the prompt for agent analysis
   */
  private buildPrompt(
    report: string, 
    options: ReportGenerationOptions,
    agentConfig?: AgentAnalysis
  ): string {
    const template = agentConfig?.promptTemplate || DEFAULT_PROMPT_TEMPLATE;
    
    // Detect analysis type from script name or operations
    const analysisType = this.detectAnalysisType(options);
    const keyMetric = this.getKeyMetric(analysisType);
    const patterns = this.getPatternType(analysisType);
    
    return template
      .replace('[ANALYSIS_TYPE]', analysisType)
      .replace('[KEY_METRIC]', keyMetric)
      .replace('[PATTERNS]', patterns)
      .replace('[REPORT CONTENT]', report);
  }
  
  /**
   * Detect the type of analysis from the script and operations
   */
  private detectAnalysisType(options: ReportGenerationOptions): string {
    const scriptName = basename(options.scriptPath).toLowerCase();
    
    if (scriptName.includes('link')) return 'document links';
    if (scriptName.includes('tag')) return 'tag distribution';
    if (scriptName.includes('orphan')) return 'orphaned documents';
    if (scriptName.includes('type')) return 'document types';
    
    return 'vault structure';
  }
  
  /**
   * Get the key metric name for the analysis type
   */
  private getKeyMetric(analysisType: string): string {
    switch (analysisType) {
      case 'document links': return 'most-linked documents';
      case 'tag distribution': return 'tag frequencies';
      case 'orphaned documents': return 'isolated documents';
      case 'document types': return 'document type distribution';
      default: return 'analysis results';
    }
  }
  
  /**
   * Get the pattern type description
   */
  private getPatternType(analysisType: string): string {
    switch (analysisType) {
      case 'document links': return 'linking patterns';
      case 'tag distribution': return 'tagging patterns';
      case 'orphaned documents': return 'isolation patterns';
      case 'document types': return 'content organization patterns';
      default: return 'organizational patterns';
    }
  }
  
  /**
   * Append agent analysis to the report
   */
  private appendAgentAnalysis(report: string, analysis: { content: string; duration: number }): string {
    const durationSeconds = (analysis.duration / 1000).toFixed(1);
    
    const analysisSection = `

---

## AI-Powered Analysis

${analysis.content}

_Analysis generated by Claude Code in ${durationSeconds} seconds_`;
    
    // Insert before the metadata footer
    const footerIndex = report.lastIndexOf('\n---\n\n## Metadata');
    if (footerIndex > -1) {
      return report.slice(0, footerIndex) + analysisSection + report.slice(footerIndex);
    } else {
      return report + analysisSection;
    }
  }
}