import type { ScriptExecutionResult, OutputFormat, ScriptOperation } from '@mmt/entities';

export interface FormatOptions {
  format: OutputFormat;
  fields?: string[];
  isPreview: boolean;
}

/**
 * Formats execution results for display based on output preferences.
 */
export class ResultFormatter {
  format(result: ScriptExecutionResult, options: FormatOptions): string {
    const header = options.isPreview 
      ? 'PREVIEW MODE - No changes made\n'
      : 'EXECUTION COMPLETE\n';

    switch (options.format) {
      case 'summary':
        return header + this.formatSummary(result, options.isPreview);
      
      case 'detailed':
        return header + this.formatDetailed(result, options.isPreview);
      
      case 'json':
        return this.formatJson(result, options.fields);
      
      case 'csv':
        return this.formatCsv(result, options.fields);
      
      default:
        return header + this.formatSummary(result, options.isPreview);
    }
  }

  private formatSummary(result: ScriptExecutionResult, isPreview: boolean): string {
    const lines: string[] = [];
    
    lines.push(`Selected ${result.attempted.length.toString()} files`);
    
    if (result.succeeded.length > 0) {
      const action = isPreview ? 'Would process' : 'Processed';
      lines.push(`${action}: ${result.succeeded.length.toString()}`);
    }
    
    if (result.failed.length > 0) {
      lines.push(`Failed: ${result.failed.length.toString()}`);
    }
    
    if (result.skipped.length > 0) {
      lines.push(`Skipped: ${result.skipped.length.toString()}`);
    }
    
    lines.push(`\nDuration: ${result.stats.duration.toString()}ms`);
    
    if (isPreview) {
      lines.push('\nTo execute these changes, run with --execute flag');
    }
    
    return lines.join('\n');
  }

  private formatDetailed(result: ScriptExecutionResult, isPreview: boolean): string {
    const lines: string[] = [];
    
    lines.push(`Selected ${result.attempted.length.toString()} files matching criteria:`);
    
    // Group by operation for cleaner output
    const operationGroups = new Map<string, typeof result.succeeded>();
    
    for (const item of result.succeeded) {
      const key = `${item.operation.type}:${JSON.stringify(item.operation)}`;
      if (!operationGroups.has(key)) {
        operationGroups.set(key, []);
      }
      operationGroups.get(key)?.push(item);
    }
    
    for (const [_opKey, items] of operationGroups) {
      const op = items[0].operation;
      lines.push(`\n${this.formatOperationHeader(op, isPreview)}:`);
      
      for (const item of items) {
        lines.push(`  ✓ ${item.item.path}`);
      }
    }
    
    if (result.failed.length > 0) {
      lines.push('\nFailed operations:');
      for (const item of result.failed) {
        lines.push(`  ✗ ${item.item.path}: ${item.error.message}`);
      }
    }
    
    if (result.skipped.length > 0) {
      lines.push('\nSkipped:');
      for (const item of result.skipped) {
        lines.push(`  - ${item.item.path}: ${item.reason}`);
      }
    }
    
    lines.push(`\nSummary:`);
    lines.push(`- Files selected: ${result.attempted.length.toString()}`);
    lines.push(`- Operations ${isPreview ? 'to perform' : 'performed'}: ${result.succeeded.length.toString()}`);
    
    if (result.failed.length > 0) {
      lines.push(`- Failed: ${result.failed.length.toString()}`);
    }
    
    lines.push(`- Duration: ${result.stats.duration.toString()}ms`);
    
    if (isPreview) {
      lines.push('\nTo execute these changes, run with --execute flag');
    }
    
    return lines.join('\n');
  }

  private formatOperationHeader(operation: ScriptOperation, isPreview: boolean): string {
    const prefix = isPreview ? 'Would' : 'Did';
    
    switch (operation.type) {
      case 'move':
        return `${prefix} move to ${String(operation.destination ?? 'unknown')}`;
      case 'delete':
        return `${prefix} delete`;
      case 'updateFrontmatter':
        return `${prefix} update frontmatter`;
      case 'rename':
        return `${prefix} rename`;
      default:
        return `${prefix} ${operation.type}`;
    }
  }

  private formatJson(result: ScriptExecutionResult, _fields?: string[]): string {
    // For JSON, include full result with optional field filtering
    const output = {
      attempted: result.attempted.length,
      succeeded: result.succeeded.map(item => ({
        path: item.item.path,
        operation: item.operation.type,
        ...item.details,
      })),
      failed: result.failed.map(item => ({
        path: item.item.path,
        operation: item.operation.type,
        error: item.error.message,
      })),
      skipped: result.skipped.map(item => ({
        path: item.item.path,
        operation: item.operation.type,
        reason: item.reason,
      })),
      stats: result.stats,
    };
    
    return JSON.stringify(output, null, 2);
  }

  private formatCsv(result: ScriptExecutionResult, fields?: string[]): string {
    // Simple CSV format for succeeded operations
    const headers = fields ?? ['path', 'operation', 'status'];
    const rows: string[] = [headers.map(h => `"${h}"`).join(',')];
    
    for (const item of result.succeeded) {
      const row = [
        item.item.path,
        item.operation.type,
        'succeeded',
      ];
      rows.push(row.map(field => `"${field}"`).join(','));
    }
    
    for (const item of result.failed) {
      const row = [
        item.item.path,
        item.operation.type,
        `failed: ${item.error.message}`,
      ];
      rows.push(row.map(field => `"${field}"`).join(','));
    }
    
    return rows.join('\n');
  }
}