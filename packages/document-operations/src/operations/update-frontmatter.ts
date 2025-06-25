import type { Document } from '@mmt/entities';
import type { 
  DocumentOperation, 
  OperationContext, 
  ValidationResult, 
  OperationPreview, 
  OperationResult,
  FileChange
} from '../types.js';
import { join, dirname } from 'path';

export interface UpdateFrontmatterOperationOptions {
  updates: Record<string, unknown>;
  mode?: 'merge' | 'replace';
}

export class UpdateFrontmatterOperation implements DocumentOperation {
  readonly type = 'updateFrontmatter' as const;
  private mode: 'merge' | 'replace';
  
  constructor(private options: UpdateFrontmatterOperationOptions) {
    this.mode = options.mode ?? 'merge';
  }

  validate(_doc: Document, _context: OperationContext): Promise<ValidationResult> {
    // Check if updates is empty
    if (Object.keys(this.options.updates).length === 0) {
      return Promise.resolve({
        valid: false,
        error: 'No updates provided'
      });
    }

    return Promise.resolve({ valid: true });
  }

  preview(doc: Document, _context: OperationContext): Promise<OperationPreview> {
    const changes: FileChange[] = [];
    
    // Show frontmatter update
    const currentFrontmatter = doc.metadata.frontmatter;
    let newFrontmatter: Record<string, unknown>;
    
    if (this.mode === 'replace') {
      // In replace mode, only the updates will remain
      newFrontmatter = { ...this.options.updates };
    } else {
      // In merge mode, merge updates with existing
      newFrontmatter = { ...currentFrontmatter };
      
      // Apply updates
      for (const [key, value] of Object.entries(this.options.updates)) {
        if (value === null) {
          // Remove the key by creating new object without it
          // eslint-disable-next-line @typescript-eslint/naming-convention
          const { [key]: _removed, ...rest } = newFrontmatter;
          newFrontmatter = rest;
        } else {
          newFrontmatter[key] = value;
        }
      }
    }
    
    // Generate YAML representations
    const beforeYaml = Object.keys(currentFrontmatter).length > 0 
      ? this.formatYaml(currentFrontmatter)
      : '(no frontmatter)';
      
    const afterYaml = Object.keys(newFrontmatter).length > 0
      ? this.formatYaml(newFrontmatter)
      : '(no frontmatter)';
    
    changes.push({
      type: 'frontmatter-update',
      file: doc.path,
      description: `Update frontmatter (${this.mode} mode)`,
      before: beforeYaml,
      after: afterYaml
    });
    
    return Promise.resolve({
      type: 'updateFrontmatter',
      source: doc.path,
      changes
    });
  }

  async execute(doc: Document, context: OperationContext): Promise<OperationResult> {
    try {
      // Create backup if requested
      let backup;
      if (context.options.createBackup && !context.options.dryRun) {
        const backupPath = await this.createBackup(doc, context);
        backup = {
          originalPath: doc.path,
          backupPath
        };
      }

      // Calculate new frontmatter
      let newFrontmatter: Record<string, unknown>;
      
      if (this.mode === 'replace') {
        // Replace mode: only use the provided updates
        newFrontmatter = { ...this.options.updates };
      } else {
        // Merge mode: merge with existing frontmatter
        newFrontmatter = { ...doc.metadata.frontmatter };
        
        // Apply updates
        for (const [key, value] of Object.entries(this.options.updates)) {
          if (value === null) {
            // Remove the key by creating new object without it
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { [key]: _removed, ...rest } = newFrontmatter;
            newFrontmatter = rest;
          } else {
            newFrontmatter[key] = value;
          }
        }
      }
      
      if (!context.options.dryRun) {
        // Read current content
        const { content } = await context.fs.readMarkdownFile(doc.path);
        
        // Write back with updated frontmatter
        await context.fs.writeMarkdownFile(doc.path, content, newFrontmatter);
      }
      
      // Create updated document
      const updatedDoc: Document = {
        ...doc,
        metadata: {
          ...doc.metadata,
          frontmatter: newFrontmatter
        }
      };

      return {
        success: true,
        document: updatedDoc,
        backup,
        dryRun: context.options.dryRun
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async createBackup(doc: Document, context: OperationContext): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/gu, '-');
    const backupDir = join(dirname(doc.path), '.backups');
    const backupPath = join(backupDir, `${doc.metadata.name}-${timestamp}.md`);
    
    // Ensure backup directory exists
    await context.fs.mkdir(backupDir, { recursive: true });
    
    // Copy file to backup location
    await context.fs.copyFile(doc.path, backupPath);
    
    return backupPath;
  }

  private formatYaml(obj: Record<string, unknown>): string {
    // Simple YAML formatter for preview purposes
    const lines: string[] = [];
    
    const formatValue = (value: unknown, indent = ''): string => {
      if (value === null) {return 'null';}
      if (value === undefined) {return 'null';}
      if (typeof value === 'boolean') {return value.toString();}
      if (typeof value === 'number') {return value.toString();}
      if (typeof value === 'string') {return value;}
      
      if (Array.isArray(value)) {
        if (value.length === 0) {return '[]';}
        return `\n${ value.map(item => `${indent}  - ${formatValue(item, `${indent }  `)}`).join('\n')}`;
      }
      
      if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length === 0) {return '{}';}
        return `\n${ entries.map(([k, v]) => {
          const formattedValue = formatValue(v, `${indent }  `);
          return `${indent}  ${k}: ${formattedValue}`;
        }).join('\n')}`;
      }
      
      return JSON.stringify(value);
    };
    
    for (const [key, value] of Object.entries(obj)) {
      const formattedValue = formatValue(value);
      lines.push(`${key}: ${formattedValue}`);
    }
    
    return lines.join('\n');
  }
}