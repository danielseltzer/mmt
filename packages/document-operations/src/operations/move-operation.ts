import { dirname, isAbsolute, basename } from 'path';
import { rename, copyFile } from 'fs/promises';
import type { Document } from '@mmt/entities';
import { FileRelocator } from '@mmt/file-relocator';
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
    const { fs, options } = context;
    
    const changes: FileChange[] = [{
      type: 'file-move',
      file: doc.path,
      description: `Move to ${targetPath}`
    }];
    
    // Find documents that link to this document
    if (options.updateLinks) {
      try {
        // Use FileRelocator to find all references
        const relocator = new FileRelocator(fs);
        const references = await relocator.findReferences(doc.path, context.vault.path);
        
        // Add link update changes for each file with references
        for (const ref of references) {
          changes.push({
            type: 'link-update',
            file: ref.filePath,
            description: `Update ${String(ref.links.length)} link(s) to ${basename(doc.path, '.md')}`
          });
        }
      } catch (error) {
        // If finding references fails, continue without link updates
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
    const { fs, options } = context;
    
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
          // Use FileRelocator for comprehensive link updates
          const relocator = new FileRelocator(fs);
          await relocator.updateReferences(doc.path, targetPath, context.vault.path);
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