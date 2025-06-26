import { join, dirname, basename } from 'path';
import { rename, copyFile } from 'fs/promises';
import type { Document } from '@mmt/entities';
import type { 
  DocumentOperation, 
  OperationContext, 
  ValidationResult, 
  OperationPreview, 
  OperationResult,
  FileChange
} from '../types.js';

export interface RenameOperationOptions {
  newName: string;
}

export class RenameOperation implements DocumentOperation {
  readonly type = 'rename' as const;
  private newName: string;

  constructor(private options: RenameOperationOptions) {
    // Normalize the new name
    this.newName = options.newName.trim();
    
    // Add .md extension if not present
    if (this.newName && !this.newName.endsWith('.md')) {
      this.newName += '.md';
    }
  }

  async validate(doc: Document, context: OperationContext): Promise<ValidationResult> {
    const { fs } = context;
    
    // Check if new name is empty
    if (!this.newName || this.newName === '.md') {
      return {
        valid: false,
        error: 'Name cannot be empty'
      };
    }
    
    // Check if new name contains path separators
    if (this.newName.includes('/') || this.newName.includes('\\')) {
      return {
        valid: false,
        error: 'Name cannot contain path separators'
      };
    }
    
    // Check if renaming to same name
    const currentName = basename(doc.path);
    if (this.newName === currentName) {
      return {
        valid: false,
        error: 'New name is same as current name'
      };
    }
    
    // Check if target file already exists
    const targetPath = join(dirname(doc.path), this.newName);
    try {
      const exists = await fs.exists(targetPath);
      if (exists) {
        return {
          valid: false,
          error: `File already exists: ${this.newName}`
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: `Failed to check target file: ${String(error)}`
      };
    }
    
    return { valid: true };
  }

  async preview(doc: Document, context: OperationContext): Promise<OperationPreview> {
    const targetPath = join(dirname(doc.path), this.newName);
    const { indexer, options } = context;
    
    const changes: FileChange[] = [{
      type: 'file-rename',
      file: doc.path,
      description: `Rename to ${this.newName}`
    }];
    
    // Find documents that link to this document
    if (options.updateLinks) {
      try {
        // Get the relative path for link lookup
        const relativePath = basename(doc.path, '.md');
        const newBaseName = basename(this.newName, '.md');
        
        // Get all documents to check for links
        // const allDocs = await indexer.getAllDocuments(); // Not used
        
        // Use backlinks to find documents that link to this one
        const relativePathForIndex = context.vault.path ? 
          doc.path.substring(context.vault.path.length + 1) : 
          doc.path;
        const linkingDocs = indexer.getBacklinks(relativePathForIndex);
        
        // Add link update changes for documents that link here
        for (const linkingDoc of linkingDocs) {
          changes.push({
            type: 'link-update',
            file: linkingDoc.path,
            description: `Update links from ${relativePath} to ${newBaseName}`
          });
        }
        
      } catch (error) {
        console.warn('Failed to find linking documents:', error);
      }
    }
    
    return {
      type: 'rename',
      source: doc.path,
      target: targetPath,
      changes
    };
  }

  async execute(doc: Document, context: OperationContext): Promise<OperationResult> {
    const targetPath = join(dirname(doc.path), this.newName);
    const { fs, indexer, options } = context;
    
    try {
      // Validate first
      const validation = await this.validate(doc, context);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error ?? 'Validation failed'
        };
      }
      
      // Create backup if requested
      let backup;
      if (options.createBackup) {
        const backupPath = `${doc.path}.backup.${String(Date.now())}`;
        await copyFile(doc.path, backupPath);
        backup = {
          originalPath: doc.path,
          backupPath
        };
      }
      
      // In dry run mode, don't actually rename
      if (options.dryRun) {
        return {
          success: true,
          dryRun: true,
          document: {
            ...doc,
            path: targetPath
          },
          backup
        };
      }
      
      // Get the old and new basenames for link updates
      const oldBaseName = basename(doc.path, '.md');
      const newBaseName = basename(this.newName, '.md');
      
      // First read the file content for self-link updates
      let content = await fs.readFile(doc.path);
      let contentUpdated = false;
      
      // Update self-references in the document being renamed
      if (options.updateLinks && content.includes(`[[${oldBaseName}]]`)) {
        content = content.replace(
          new RegExp(`\\[\\[${oldBaseName}\\]\\]`, 'gu'),
          `[[${newBaseName}]]`
        );
        contentUpdated = true;
      }
      
      // Write updated content if changed
      if (contentUpdated) {
        await fs.writeFile(doc.path, content);
      }
      
      // Update links in other documents if enabled
      if (options.updateLinks) {
        try {
          // Get all documents
          const allDocs = indexer.getAllDocuments();
          
          // Update each document that might link to this one
          for (const linkingDoc of allDocs) {
            if (linkingDoc.path !== doc.path) {
              // Read the file content
              let linkingContent = await fs.readFile(linkingDoc.path);
              
              // Check if it contains links to the old name
              if (linkingContent.includes(`[[${oldBaseName}]]`)) {
                // Replace the links
                linkingContent = linkingContent.replace(
                  new RegExp(`\\[\\[${oldBaseName}\\]\\]`, 'gu'),
                  `[[${newBaseName}]]`
                );
                
                // Write updated content
                await fs.writeFile(linkingDoc.path, linkingContent);
              }
            }
          }
        } catch (error) {
          console.error('Failed to update links:', error);
          // Continue with rename even if link update fails
        }
      }
      
      // Perform the actual rename
      await rename(doc.path, targetPath);
      
      // Update the document object
      const renamedDoc: Document = {
        ...doc,
        path: targetPath,
        metadata: {
          ...doc.metadata,
          name: newBaseName
        }
      };
      
      return {
        success: true,
        document: renamedDoc,
        backup
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to rename file: ${String(error)}`
      };
    }
  }
}