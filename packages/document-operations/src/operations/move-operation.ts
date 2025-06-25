import { dirname, relative, isAbsolute, basename } from 'path';
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

export interface MoveOperationOptions {
  targetPath: string;
}

export class MoveOperation implements DocumentOperation {
  readonly type = 'move' as const;

  constructor(private options: MoveOperationOptions) {
    if (!options.targetPath) {
      throw new Error('Target path is required for move operation');
    }
  }

  async validate(doc: Document, context: OperationContext): Promise<ValidationResult> {
    const { targetPath } = this.options;
    const { fs, vault, options } = context;
    
    // Check if source and target are the same
    if (doc.path === targetPath) {
      return {
        valid: false,
        error: 'Source and target paths are the same'
      };
    }
    
    // Check if target is within vault (unless allowed)
    if (!options.allowOutsideVault) {
      const isInVault = isAbsolute(targetPath) 
        ? targetPath.startsWith(vault.path)
        : true; // Relative paths are assumed to be within vault
      
      if (!isInVault) {
        return {
          valid: false,
          error: 'Target path is outside vault and allowOutsideVault is not enabled'
        };
      }
    }
    
    // Check if target directory exists
    const targetDir = dirname(targetPath);
    try {
      const dirExists = await fs.exists(targetDir);
      if (!dirExists) {
        return {
          valid: false,
          error: `Target directory does not exist: ${targetDir}`
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: `Failed to check target directory: ${String(error)}`
      };
    }
    
    // Check if target file already exists
    try {
      const targetExists = await fs.exists(targetPath);
      if (targetExists) {
        return {
          valid: false,
          error: `Target file already exists: ${targetPath}`
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
    const { targetPath } = this.options;
    const { indexer, options } = context;
    
    const changes: FileChange[] = [{
      type: 'file-move',
      file: doc.path,
      description: `Move to ${targetPath}`
    }];
    
    // Find documents that link to this document
    if (options.updateLinks) {
      try {
        // Get the relative path for link lookup
        const relativePath = relative(context.vault.path, doc.path);
        
        // Get documents that have backlinks to this document
        const linkingDocs = await indexer.getBacklinks(relativePath);
        
        // Add link update changes for each linking document
        for (const linkingDoc of linkingDocs) {
          changes.push({
            type: 'link-update',
            file: linkingDoc.path,
            description: `Update links to ${basename(doc.path, '.md')}`
          });
        }
      } catch (error) {
        // If indexer fails, continue without link updates
        console.warn('Failed to find linking documents:', error);
      }
    }
    
    return {
      type: 'move',
      source: doc.path,
      target: targetPath,
      changes
    };
  }

  async execute(doc: Document, context: OperationContext): Promise<OperationResult> {
    const { targetPath } = this.options;
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
      
      // In dry run mode, don't actually move
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
      
      // Update links if enabled
      if (options.updateLinks) {
        try {
          // Get the relative paths
          const oldRelativePath = relative(context.vault.path, doc.path);
          // const newRelativePath = relative(context.vault.path, targetPath); // Not used yet
          
          // Get documents that link to this document
          const linkingDocs = await indexer.getBacklinks(oldRelativePath);
          
          // Update each linking document
          for (const linkingDoc of linkingDocs) {
            // Read the file content
            let content = await fs.readFile(linkingDoc.path);
            
            // Update wikilinks
            const oldName = basename(doc.path, '.md');
            const newName = basename(targetPath, '.md');
            
            // Get relative paths without extension
            const oldRelativePathNoExt = relative(context.vault.path, doc.path).replace(/\.md$/u, '');
            const newRelativePathNoExt = relative(context.vault.path, targetPath).replace(/\.md$/u, '');
            
            // Try to replace vault-relative paths like [[notes/doc1]]
            if (content.includes(`[[${oldRelativePathNoExt}]]`)) {
              content = content.replace(
                new RegExp(`\\[\\[${oldRelativePathNoExt.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\]\\]`, 'gu'),
                `[[${newRelativePathNoExt}]]`
              );
            }
            
            // Try to replace paths relative to the linking document
            const oldRelativeFromLinking = relative(dirname(linkingDoc.path), doc.path).replace(/\.md$/u, '');
            const newRelativeFromLinking = relative(dirname(linkingDoc.path), targetPath).replace(/\.md$/u, '');
            
            if (oldRelativeFromLinking !== oldRelativePath && content.includes(`[[${oldRelativeFromLinking}]]`)) {
              content = content.replace(
                new RegExp(`\\[\\[${oldRelativeFromLinking.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\]\\]`, 'gu'),
                `[[${newRelativeFromLinking}]]`
              );
            }
            
            // Also try basename-only links like [[doc1]]
            if (content.includes(`[[${oldName}]]`)) {
              // If moving to different directory, use relative path
              if (dirname(doc.path) !== dirname(targetPath)) {
                content = content.replace(
                  new RegExp(`\\[\\[${oldName}\\]\\]`, 'gu'),
                  `[[${newRelativeFromLinking}]]`
                );
              } else {
                // Same directory, just update the name
                content = content.replace(
                  new RegExp(`\\[\\[${oldName}\\]\\]`, 'gu'),
                  `[[${newName}]]`
                );
              }
            }
            
            // Write updated content
            await fs.writeFile(linkingDoc.path, content);
          }
        } catch (error) {
          console.error('Failed to update links:', error);
          // Continue with move even if link update fails
        }
      }
      
      // Perform the actual move
      await rename(doc.path, targetPath);
      
      // Update the document object
      const movedDoc: Document = {
        ...doc,
        path: targetPath
      };
      
      return {
        success: true,
        document: movedDoc,
        backup
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to move file: ${String(error)}`
      };
    }
  }
}