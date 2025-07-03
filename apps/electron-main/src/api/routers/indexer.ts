import { initTRPC } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { z } from 'zod';
import type { Context } from '../context.js';

const t = initTRPC.context<Context>().create();

export const indexerRouter = t.router({
  // Reindex the vault
  reindex: t.procedure
    .mutation(async ({ ctx }) => {
      const { indexer } = ctx;
      
      // Shut down existing indexer
      await indexer.shutdown();
      
      // Re-initialize
      await indexer.initialize();
      
      return {
        success: true,
        documentCount: indexer.getAllDocuments().length,
      };
    }),

  // Subscribe to progress updates
  onProgress: t.procedure
    .subscription(() => {
      return observable<{ phase: string; progress?: number; file?: string }>((emit) => {
        let progress = 0;
        const totalSteps = 10;
        
        // Emit initial scanning phase
        emit.next({ phase: 'scanning', progress: 0 });
        
        // Simulate progress updates
        const interval = setInterval(() => {
          progress += 1;
          
          if (progress <= totalSteps) {
            const percentage = Math.floor((progress / totalSteps) * 100);
            
            if (percentage < 30) {
              emit.next({ 
                phase: 'scanning', 
                progress: percentage,
                file: `file${String(progress)}.md`
              });
            } else if (percentage < 90) {
              emit.next({ 
                phase: 'indexing', 
                progress: percentage,
                file: `file${String(progress)}.md`
              });
            } else {
              emit.next({ 
                phase: 'complete', 
                progress: 100 
              });
              clearInterval(interval);
            }
          }
        }, 100);
        
        // Cleanup on unsubscribe
        return () => {
          clearInterval(interval);
        };
      });
    }),

  // Get indexer status
  status: t.procedure
    .query(({ ctx }) => {
      const { indexer } = ctx;
      const documents = indexer.getAllDocuments();
      
      return {
        isInitialized: true,
        documentCount: documents.length,
        lastIndexTime: new Date().toISOString(),
      };
    }),

  // Get indexer statistics
  stats: t.procedure
    .query(({ ctx }) => {
      const { indexer } = ctx;
      const documents = indexer.getAllDocuments();
      
      return {
        totalDocuments: documents.length,
        totalSize: documents.reduce((sum, doc) => sum + doc.size, 0),
        lastIndexed: new Date().toISOString(),
        byExtension: {
          '.md': documents.length, // All are markdown in our case
        },
        byFolder: documents.reduce<Record<string, number>>((acc, doc) => {
          const folder = doc.path.split('/').slice(0, -1).join('/') || '/';
          acc[folder] = (acc[folder] || 0) + 1;
          return acc;
        }, {}),
      };
    }),

  // Get all documents
  getAllDocuments: t.procedure
    .query(({ ctx }) => {
      const { indexer } = ctx;
      const documents = indexer.getAllDocuments();
      
      return {
        documents,
        totalCount: documents.length,
      };
    }),

  // Get document by path
  getDocument: t.procedure
    .input(z.object({
      path: z.string(),
    }))
    .query(({ input, ctx }) => {
      const { indexer } = ctx;
      const documents = indexer.getAllDocuments();
      const document = documents.find(d => d.path === input.path);
      
      if (!document) {
        throw new Error(`Document not found: ${input.path}`);
      }
      
      return document;
    }),

  // Get backlinks for a document
  getBacklinks: t.procedure
    .input(z.object({
      path: z.string(),
    }))
    .query(({ input, ctx }) => {
      const { indexer } = ctx;
      const backlinks = indexer.getBacklinks(input.path);
      
      return {
        documents: backlinks,
        totalCount: backlinks.length,
      };
    }),

  // Get outgoing links from a document
  getOutgoingLinks: t.procedure
    .input(z.object({
      path: z.string(),
    }))
    .query(({ input, ctx }) => {
      const { indexer } = ctx;
      const links = indexer.getOutgoingLinks(input.path);
      
      return {
        documents: links,
        totalCount: links.length,
      };
    }),

  // Watch for changes
  watchChanges: t.procedure
    .input(z.object({
      enabled: z.boolean().optional().default(true),
    }))
    .mutation(({ input }) => {
      // TODO: Implement file watching control
      // For now, file watching is enabled by default in context creation
      
      return {
        watching: input.enabled,
      };
    }),
});