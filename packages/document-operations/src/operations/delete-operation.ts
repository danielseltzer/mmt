import type { Document } from '@mmt/entities';
import type { 
  DocumentOperation, 
  OperationContext, 
  ValidationResult, 
  OperationPreview, 
  OperationResult,
  FileChange
} from '../types.js';
import { join, basename, dirname, relative, isAbsolute } from 'path';

export interface DeleteOperationOptions {
  trashPath?: string;
  permanent?: boolean;
  createBackup?: boolean;
  organizeTrashdByDate?: boolean;
}

export class DeleteOperation implements DocumentOperation {
  readonly type = 'delete' as const;

  constructor(private options: DeleteOperationOptions = {}) {}

  async validate(doc: Document, context: OperationContext): Promise<ValidationResult> {
    const errors: string[] = [];

    // Check if file exists
    if (!await context.fs.exists(doc.path)) {
      errors.push('File does not exist');
    }

    // Check if file is within vault
    const vaultPath = context.vault.path;
    const normalizedDocPath = isAbsolute(doc.path) ? doc.path : join(vaultPath, doc.path);
    const relativePath = relative(vaultPath, normalizedDocPath);
    
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      errors.push('Cannot delete files outside vault');
    }

    return {
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  async preview(doc: Document, context: OperationContext): Promise<OperationPreview> {
    const changes: FileChange[] = [];
    const vaultPath = context.vault.path;

    if (this.options.permanent) {
      changes.push({
        type: 'file-delete',
        file: doc.path,
        description: 'Permanently delete file'
      });
    } else {
      // Calculate trash path
      const trashPath = this.options.trashPath ?? join(vaultPath, '.trash');
      const [timestamp] = new Date().toISOString().replace(/[-:]/gu, '').replace('T', '-').split('.');
      const fileName = basename(doc.path);
      const trashFileName = `${timestamp}-${fileName}`;
      
      let targetPath: string;
      if (this.options.organizeTrashdByDate) {
        const [dateFolder] = new Date().toISOString().split('T'); // YYYY-MM-DD
        targetPath = join(trashPath, dateFolder, trashFileName);
      } else {
        targetPath = join(trashPath, trashFileName);
      }

      changes.push({
        type: 'file-move',
        file: doc.path,
        description: `Move to trash: ${relative(vaultPath, targetPath)}`
      });
    }

    // Find documents that link to this file
    const relativePath = relative(vaultPath, doc.path);
    const backlinks = await context.indexer.getBacklinks(relativePath);
    for (const linkingDoc of backlinks) {
      changes.push({
        type: 'link-update',
        file: linkingDoc.path,
        description: 'Update link to deleted file'
      });
    }

    return {
      type: 'delete',
      source: doc.path,
      target: this.options.permanent ? undefined : this.getTrashPath(doc.path, context.vault.path),
      changes
    };
  }

  async execute(doc: Document, context: OperationContext): Promise<OperationResult> {
    try {
      // Validate first
      const validation = await this.validate(doc, context);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error ?? 'Validation failed'
        };
      }

      // Handle dry run
      if (context.options.dryRun) {
        return {
          success: true,
          document: doc
        };
      }

      // Create backup if requested
      if (this.options.createBackup || context.options.createBackup) {
        await this.createBackup(doc, context);
      }

      // Update links in referencing documents first
      const relativePath = relative(context.vault.path, doc.path);
      const backlinks = await context.indexer.getBacklinks(relativePath);
      for (const linkingDoc of backlinks) {
        await this.updateLinksInDocument(linkingDoc.path, doc.path, context);
      }

      // Delete the file
      if (this.options.permanent) {
        // Permanent deletion
        await context.fs.unlink(doc.path);
      } else {
        // Move to trash
        await this.moveToTrash(doc.path, context);
      }

      return {
        success: true,
        document: {
          ...doc,
          path: this.options.permanent ? '' : this.getTrashPath(doc.path, context.vault.path)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private getTrashPath(filePath: string, vaultPath: string): string {
    const trashPath = this.options.trashPath ?? join(vaultPath, '.trash');
    const [timestamp] = new Date().toISOString().replace(/[-:]/gu, '').replace('T', '-').split('.');
    const fileName = basename(filePath);
    const trashFileName = `${timestamp}-${fileName}`;
    
    if (this.options.organizeTrashdByDate) {
      const [dateFolder] = new Date().toISOString().split('T'); // YYYY-MM-DD
      return join(trashPath, dateFolder, trashFileName);
    } 
      return join(trashPath, trashFileName);
    
  }

  private async moveToTrash(filePath: string, context: OperationContext): Promise<string> {
    const trashPath = this.getTrashPath(filePath, context.vault.path);
    const trashDir = dirname(trashPath);

    // Ensure trash directory exists
    await context.fs.mkdir(trashDir, { recursive: true });

    // Move file to trash
    await context.fs.rename(filePath, trashPath);

    return trashPath;
  }

  private async createBackup(doc: Document, context: OperationContext): Promise<void> {
    const backupDir = join(context.vault.path, '.backups');
    await context.fs.mkdir(backupDir, { recursive: true });

    const [timestamp] = new Date().toISOString().replace(/[-:]/gu, '').replace('T', '-').split('.');
    const fileName = basename(doc.path);
    const backupPath = join(backupDir, `${fileName.replace('.md', '')}-${timestamp}.backup`);

    await context.fs.copyFile(doc.path, backupPath);
  }

  private async updateLinksInDocument(
    docPath: string,
    deletedPath: string,
    context: OperationContext
  ): Promise<void> {
    const content = await context.fs.readFile(docPath);
    const deletedName = basename(deletedPath).replace('.md', '');
    
    // Update wikilinks and embeds to show deleted status
    let updatedContent = content;
    
    // Escape special regex characters in filename
    const escapedName = deletedName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    
    // Replace [[deleted-file]] and [[deleted-file|alias]] with [[deleted-file|❌ DELETED]]
    const wikiLinkRegex = new RegExp(`\\[\\[${escapedName}(?:\\|[^\\]]+)?\\]\\]`, 'gu');
    updatedContent = updatedContent.replace(wikiLinkRegex, `[[${deletedName}|❌ DELETED]]`);
    
    // Replace ![[deleted-file]] and ![[deleted-file|alias]] with ![[deleted-file|❌ DELETED]]
    const embedRegex = new RegExp(`!\\[\\[${escapedName}(?:\\|[^\\]]+)?\\]\\]`, 'gu');
    updatedContent = updatedContent.replace(embedRegex, `![[${deletedName}|❌ DELETED]]`);

    if (updatedContent !== content) {
      await context.fs.writeFile(docPath, updatedContent);
    }
  }
}