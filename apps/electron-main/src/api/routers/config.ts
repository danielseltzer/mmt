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
    .mutation(({ input }) => {
      // TODO: Implement config loading from input.configPath
      console.log('Loading config from:', input.configPath);
      return {
        success: true,
        config: {
          vaultPath: '/path/to/vault',
          indexPath: '/path/to/index',
        },
      };
    }),

  // Get current configuration
  get: t.procedure.query(() => {
    // TODO: Return current config
    return null;
  }),

  // Validate configuration
  validate: t.procedure
    .input(z.object({
      config: z.record(z.unknown()),
    }))
    .query(({ input }) => {
      // TODO: Validate config using @mmt/config
      console.log('Validating config:', input.config);
      return { valid: true, errors: [] };
    }),
});