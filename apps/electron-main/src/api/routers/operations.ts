import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Context } from '../context.js';
import { OperationSchema } from '@mmt/entities';
import type { OperationContext } from '@mmt/document-operations';

const t = initTRPC.context<Context>().create();

// Helper to create OperationContext from tRPC context
function createOperationContext(ctx: Context, options: {
  dryRun?: boolean;
  updateLinks?: boolean;
  createBackup?: boolean;
  continueOnError?: boolean;
} = {}): OperationContext {
  return {
    vault: { path: ctx.config.vaultPath },
    fs: ctx.fileSystem,
    indexer: ctx.indexer,
    options: {
      dryRun: options.dryRun ?? false,
      updateLinks: options.updateLinks ?? true,
      createBackup: options.createBackup ?? false,
      continueOnError: options.continueOnError ?? false,
    },
  };
}

export const operationsRouter = t.router({
  // Validate an operation
  validate: t.procedure
    .input(OperationSchema)
    .query(async ({ input, ctx }) => {
      const { operationRegistry } = ctx;
      
      try {
        // Map from schema type to operation type
        const operationType = input.type === 'update-frontmatter' ? 'updateFrontmatter' : input.type;
        const operation = operationRegistry.create(operationType as any, input);
        
        // Load the document (operations need the document object)
        // For validation, we need to determine which path to use
        let documentPath: string;
        if ('sourcePath' in input) {
          documentPath = input.sourcePath;
        } else if ('path' in input) {
          documentPath = input.path;
        } else {
          throw new Error('No document path specified');
        }
        
        const content = await ctx.fileSystem.readFile(documentPath);
        const doc = {
          path: documentPath,
          content,
          metadata: {
            name: documentPath.split('/').pop()?.replace('.md', '') || '',
            modified: new Date(),
            size: content.length,
            frontmatter: {},
            tags: [],
            links: [],
          }
        };
        
        const operationCtx = createOperationContext(ctx);
        const result = await operation.validate(doc, operationCtx);
        return result;
      } catch (error) {
        return {
          valid: false,
          errors: [(error as Error).message],
        };
      }
    }),

  // Move operation
  move: t.procedure
    .input(z.object({
      sourcePath: z.string(),
      targetPath: z.string(),
      updateLinks: z.boolean().optional().default(true),
      createBackup: z.boolean().optional().default(false),
      dryRun: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const { operationRegistry, fileSystem } = ctx;
      
      // Check if source file exists
      if (!await fileSystem.exists(input.sourcePath)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `File not found: ${input.sourcePath}`,
          cause: { code: 'FILE_NOT_FOUND' },
        });
      }
      
      const operation = operationRegistry.create('move', {
        targetPath: input.targetPath,
      });
      
      // Load the source document
      const content = await ctx.fileSystem.readFile(input.sourcePath);
      const doc = {
        path: input.sourcePath,
        content,
        metadata: {
          name: input.sourcePath.split('/').pop()?.replace('.md', '') || '',
          modified: new Date(),
          size: content.length,
          frontmatter: {},
          tags: [],
          links: [],
        }
      };
      
      const operationCtx = createOperationContext(ctx, {
        dryRun: input.dryRun,
        updateLinks: input.updateLinks,
        createBackup: input.createBackup,
      });
      
      const result = await operation.execute(doc, operationCtx);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error,
        });
      }
      
      return {
        success: true,
        document: result.document,
      };
    }),

  // Rename operation
  rename: t.procedure
    .input(z.object({
      path: z.string(),
      newName: z.string(),
      updateLinks: z.boolean().optional().default(true),
      createBackup: z.boolean().optional().default(false),
      dryRun: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const { operationRegistry, fileSystem } = ctx;
      
      // Check if file exists
      if (!await fileSystem.exists(input.path)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `File not found: ${input.path}`,
          cause: { code: 'FILE_NOT_FOUND' },
        });
      }
      
      const operation = operationRegistry.create('rename', {
        newName: input.newName,
      });
      
      // Load the document
      const content = await ctx.fileSystem.readFile(input.path);
      const doc = {
        path: input.path,
        content,
        metadata: {
          name: input.path.split('/').pop()?.replace('.md', '') || '',
          modified: new Date(),
          size: content.length,
          frontmatter: {},
          tags: [],
          links: [],
        }
      };
      
      const operationCtx = createOperationContext(ctx, {
        dryRun: input.dryRun,
        updateLinks: input.updateLinks,
        createBackup: input.createBackup,
      });
      
      const result = await operation.execute(doc, operationCtx);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error,
        });
      }
      
      return result;
    }),

  // Update frontmatter operation
  updateFrontmatter: t.procedure
    .input(z.object({
      path: z.string(),
      updates: z.record(z.unknown()),
      mode: z.enum(['merge', 'replace']).optional().default('merge'),
      createBackup: z.boolean().optional().default(false),
      dryRun: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const { operationRegistry, fileSystem } = ctx;
      
      // Check if file exists
      if (!await fileSystem.exists(input.path)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `File not found: ${input.path}`,
          cause: { code: 'FILE_NOT_FOUND' },
        });
      }
      
      const operation = operationRegistry.create('updateFrontmatter', {
        updates: input.updates,
        mode: input.mode,
      });
      
      // Load the document
      const content = await ctx.fileSystem.readFile(input.path);
      const doc = {
        path: input.path,
        content,
        metadata: {
          name: input.path.split('/').pop()?.replace('.md', '') || '',
          modified: new Date(),
          size: content.length,
          frontmatter: {},
          tags: [],
          links: [],
        }
      };
      
      const operationCtx = createOperationContext(ctx, {
        dryRun: input.dryRun,
        createBackup: input.createBackup,
      });
      
      const result = await operation.execute(doc, operationCtx);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error,
        });
      }
      
      return result;
    }),

  // Delete operation
  delete: t.procedure
    .input(z.object({
      path: z.string(),
      permanent: z.boolean().optional().default(false),
      createBackup: z.boolean().optional().default(false),
      dryRun: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const { operationRegistry, fileSystem } = ctx;
      
      // Check if file exists
      if (!await fileSystem.exists(input.path)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `File not found: ${input.path}`,
          cause: { code: 'FILE_NOT_FOUND' },
        });
      }
      
      const operation = operationRegistry.create('delete', {
        permanent: input.permanent,
      });
      
      // Load the document
      const content = await ctx.fileSystem.readFile(input.path);
      const doc = {
        path: input.path,
        content,
        metadata: {
          name: input.path.split('/').pop()?.replace('.md', '') || '',
          modified: new Date(),
          size: content.length,
          frontmatter: {},
          tags: [],
          links: [],
        }
      };
      
      const operationCtx = createOperationContext(ctx, {
        dryRun: input.dryRun,
        createBackup: input.createBackup,
      });
      
      const result = await operation.execute(doc, operationCtx);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error,
        });
      }
      
      return result;
    }),

  // Batch operations
  batch: t.procedure
    .input(z.object({
      operations: z.array(OperationSchema),
      failFast: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const { operationRegistry } = ctx;
      const results = [];
      
      for (const op of input.operations) {
        try {
          // Map from schema type to operation type
          const operationType = op.type === 'update-frontmatter' ? 'updateFrontmatter' : op.type;
          const operation = operationRegistry.create(operationType as any, op);
          
          // Load the document for the operation
          let documentPath: string;
          if ('sourcePath' in op) {
            documentPath = op.sourcePath;
          } else if ('path' in op) {
            documentPath = op.path;
          } else {
            throw new Error('No document path specified');
          }
          
          const content = await ctx.fileSystem.readFile(documentPath);
          const doc = {
            path: documentPath,
            content,
            metadata: {
              name: documentPath.split('/').pop()?.replace('.md', '') || '',
              modified: new Date(),
              size: content.length,
              frontmatter: {},
              tags: [],
              links: [],
            }
          };
          
          const operationCtx = createOperationContext(ctx, {
            continueOnError: !input.failFast,
          });
          
          const result = await operation.execute(doc, operationCtx);
          results.push(result);
          
          if (!result.success && input.failFast) {
            break;
          }
        } catch (error) {
          const errorResult = {
            success: false,
            error: (error as Error).message,
          };
          results.push(errorResult);
          
          if (input.failFast) {
            break;
          }
        }
      }
      
      return {
        results,
        totalOperations: input.operations.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
      };
    }),
});