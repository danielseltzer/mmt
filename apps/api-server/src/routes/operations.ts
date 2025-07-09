import { Router } from 'express';
import type { Context } from '../context.js';
import { validate } from '../middleware/validate.js';
import { 
  OperationRequestSchema,
  OperationResponseSchema,
  BatchOperationRequestSchema,
  BatchOperationResponseSchema,
} from '@mmt/entities';

export function operationsRouter(context: Context): Router {
  const router = Router();
  
  // POST /api/operations/execute - Execute a single operation
  router.post('/execute',
    validate(OperationRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const operation = req.body;
        const response = await executeOperation(context, operation);
        res.json(response);
      } catch (error) {
        next(error);
      }
    }
  );
  
  // POST /api/operations/batch - Execute multiple operations
  router.post('/batch',
    validate(BatchOperationRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { operations, stopOnError } = req.body;
        const results = [];
        let successful = 0;
        let failed = 0;
        
        for (const operation of operations) {
          try {
            const result = await executeOperation(context, operation);
            results.push(result);
            if (result.success) {
              successful++;
            } else {
              failed++;
            }
          } catch (error) {
            failed++;
            const errorResult = OperationResponseSchema.parse({
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error',
              changes: [],
              errors: [{ path: '', error: String(error) }],
            });
            results.push(errorResult);
            
            if (stopOnError) {
              break;
            }
          }
        }
        
        const response = BatchOperationResponseSchema.parse({
          results,
          summary: {
            total: operations.length,
            successful,
            failed,
          },
        });
        
        res.json(response);
      } catch (error) {
        next(error);
      }
    }
  );
  
  // POST /api/operations/preview - Preview operation without executing
  router.post('/preview',
    validate(OperationRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const operation = req.body;
        
        // Perform dry run to get preview
        const preview = await previewOperation(context, operation);
        res.json(preview);
      } catch (error) {
        next(error);
      }
    }
  );
  
  return router;
}

async function executeOperation(context: Context, operation: any): Promise<any> {
  const changes = [];
  const errors = [];
  
  try {
    // Map REST API operation format to internal operation format
    let internalOp: any;
    
    switch (operation.type) {
      case 'move':
        // Execute move for each file
        for (const filePath of operation.files) {
          try {
            const moveOp = {
              type: 'move',
              sourcePath: filePath,
              targetPath: operation.destination + '/' + filePath.split('/').pop(),
            };
            
            const moveOperation = context.operationRegistry.create('move', { targetPath: moveOp.targetPath });
            
            // Create operation context
            const operationContext = {
              fs: context.fs,
              vault: { path: context.config.vaultPath },
              indexer: context.indexer,
              options: { 
                updateLinks: operation.updateLinks,
                dryRun: false,
                createBackup: false,
                continueOnError: false,
              },
            };
            
            // Execute operation on the document
            const doc = { path: filePath };
            const result = await moveOperation.execute(doc as any, operationContext);
            
            changes.push({
              type: 'moved',
              path: filePath,
              details: {
                from: filePath,
                to: moveOp.targetPath,
              },
            });
            
            // Update links if requested
            if (operation.updateLinks) {
              await context.fileRelocator.updateReferences(filePath, moveOp.targetPath, context.config.vaultPath);
            }
          } catch (error) {
            errors.push({
              path: filePath,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        break;
        
      case 'updateFrontmatter':
        // Execute frontmatter update for each file
        for (const filePath of operation.files) {
          try {
            const updateOp = {
              type: 'update-frontmatter',
              path: filePath,
              updates: operation.updates,
              mode: operation.mode,
            };
            
            const updateOperation = context.operationRegistry.create('updateFrontmatter', updateOp);
            
            // Create operation context
            const operationContext = {
              fs: context.fs,
              vault: { path: context.config.vaultPath },
              indexer: context.indexer,
              options: {
                updateLinks: false,
                dryRun: false,
                createBackup: false,
                continueOnError: false,
              },
            };
            
            // Execute operation on the document
            const doc = { path: filePath };
            const result = await updateOperation.execute(doc as any, operationContext);
            
            changes.push({
              type: 'frontmatterUpdated',
              path: filePath,
              details: operation.updates,
            });
          } catch (error) {
            errors.push({
              path: filePath,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        break;
        
      case 'bulkRename':
        // Execute rename for each file matching pattern
        for (const filePath of operation.files) {
          try {
            const newName = filePath.replace(new RegExp(operation.pattern), operation.replacement);
            if (newName !== filePath) {
              const renameOp = {
                type: 'rename',
                path: filePath,
                newName: newName.split('/').pop(),
              };
              
              const renameOperation = context.operationRegistry.create('rename', { newName: renameOp.newName });
              
              // Create operation context
              const operationContext = {
                fs: context.fs,
                vault: { path: context.config.vaultPath },
                indexer: context.indexer,
                options: {
                  updateLinks: true,
                  dryRun: false,
                  createBackup: false,
                  continueOnError: false,
                },
              };
              
              // Execute operation on the document
              const doc = { path: filePath };
              const result = await renameOperation.execute(doc as any, operationContext);
              
              changes.push({
                type: 'renamed',
                path: filePath,
                details: {
                  from: filePath,
                  to: newName,
                },
              });
            }
          } catch (error) {
            errors.push({
              path: filePath,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        break;
        
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
    
    return OperationResponseSchema.parse({
      success: errors.length === 0,
      message: `Operation completed: ${changes.length} successful, ${errors.length} failed`,
      changes,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return OperationResponseSchema.parse({
      success: false,
      message: error instanceof Error ? error.message : 'Operation failed',
      changes: [],
      errors: [{
        path: '',
        error: error instanceof Error ? error.message : String(error),
      }],
    });
  }
}

async function previewOperation(context: Context, operation: any): Promise<any> {
  // Similar to executeOperation but with dryRun: true
  // This would show what changes would be made without actually making them
  return {
    operation,
    preview: {
      affectedFiles: operation.files,
      estimatedChanges: operation.files.length,
      warnings: [],
    },
  };
}