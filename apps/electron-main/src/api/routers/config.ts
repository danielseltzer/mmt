import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import type { Context } from '../router.js';

const t = initTRPC.context<Context>().create();

export const configRouter = t.router({
  // Load configuration
  load: t.procedure
    .input(z.object({
      configPath: z.string(),
    }))
    .mutation(async ({ input }) => {
      // TODO: Implement config loading
      return {
        success: true,
        config: {
          vaultPath: '/path/to/vault',
          indexPath: '/path/to/index',
        },
      };
    }),

  // Get current configuration
  get: t.procedure.query(async () => {
    // TODO: Return current config
    return null;
  }),

  // Validate configuration
  validate: t.procedure
    .input(z.object({
      config: z.record(z.unknown()),
    }))
    .query(async ({ input }) => {
      // TODO: Validate config using @mmt/config
      return { valid: true, errors: [] };
    }),
});