import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { configRouter } from './routers/config.js';
import { indexerRouter } from './routers/indexer.js';
import { operationsRouter } from './routers/operations.js';
import { scriptingRouter } from './routers/scripting.js';

// Context type for our tRPC instance
export type Context = {
  // Add context properties as needed
};

const t = initTRPC.context<Context>().create();

// Main app router
export const router = t.router({
  config: configRouter,
  indexer: indexerRouter,
  operations: operationsRouter,
  scripting: scriptingRouter,
  
  // System utilities
  ping: t.procedure.query(() => 'pong'),
  
  version: t.procedure.query(() => ({
    app: process.env.npm_package_version || '0.1.0',
    electron: process.versions.electron,
    node: process.versions.node,
  })),
});

export type AppRouter = typeof router;