import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import type { Context } from '../router.js';

const t = initTRPC.context<Context>().create();

export const operationsRouter = t.router({
  // Preview operation
  preview: t.procedure
    .input(z.object({
      operation: z.enum(['move', 'rename', 'delete', 'updateFrontmatter']),
      documents: z.array(z.object({
        path: z.string(),
      })),
      options: z.record(z.unknown()),
    }))
    .query(async ({ input }) => {
      // TODO: Use OperationRegistry to preview
      return {
        affectedFiles: [],
        changes: [],
      };
    }),

  // Execute operation
  execute: t.procedure
    .input(z.object({
      operation: z.enum(['move', 'rename', 'delete', 'updateFrontmatter']),
      documents: z.array(z.object({
        path: z.string(),
      })),
      options: z.record(z.unknown()),
    }))
    .mutation(async ({ input }) => {
      // TODO: Use OperationRegistry to execute
      return {
        success: true,
        results: [],
      };
    }),

  // Get operation history
  getHistory: t.procedure.query(async () => {
    // TODO: Return operation history
    return {
      operations: [],
    };
  }),
});