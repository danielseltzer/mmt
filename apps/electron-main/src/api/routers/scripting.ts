import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import type { Context } from '../router.js';

const t = initTRPC.context<Context>().create();

export const scriptingRouter = t.router({
  // Run a script
  run: t.procedure
    .input(z.object({
      scriptPath: z.string(),
      options: z.record(z.unknown()).optional(),
    }))
    .mutation(({ input }) => {
      // TODO: Use ScriptRunner with input.scriptPath and input.options
      console.log('Running script:', input.scriptPath, input.options);
      return {
        success: true,
        result: {
          attempted: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
        },
      };
    }),

  // Validate a script
  validate: t.procedure
    .input(z.object({
      scriptPath: z.string(),
    }))
    .query(({ input }) => {
      // TODO: Validate script syntax for input.scriptPath
      console.log('Validating script:', input.scriptPath);
      return {
        valid: true,
        errors: [],
      };
    }),

  // Get script templates
  getTemplates: t.procedure.query(() => {
    return {
      templates: [
        {
          name: 'Move by Pattern',
          description: 'Move files matching a pattern to a new location',
          code: '// Template code here',
        },
        {
          name: 'Bulk Rename',
          description: 'Rename multiple files using a pattern',
          code: '// Template code here',
        },
      ],
    };
  }),
});