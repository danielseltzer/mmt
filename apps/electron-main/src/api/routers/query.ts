import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import type { Context } from '../context.js';
import { QueryInputSchema } from '@mmt/entities';
import { fromDocuments } from '@mmt/document-set';

const t = initTRPC.context<Context>().create();

export const queryRouter = t.router({
  // Search documents
  search: t.procedure
    .input(QueryInputSchema)
    .query(async ({ input, ctx }) => {
      const { indexer, queryParser } = ctx;
      const startTime = Date.now();
      
      // Parse the query
      const parsedQuery = queryParser.parse(input);
      
      // Convert parsed query to indexer Query format
      const conditions: any[] = [];
      
      // Convert filesystem conditions
      if (parsedQuery.filesystem) {
        for (const [key, value] of Object.entries(parsedQuery.filesystem)) {
          // For filesystem, we want to match against actual file properties
          let fieldName = key;
          if (key === 'name') fieldName = 'basename';
          if (key === 'path') fieldName = 'relativePath';
          
          conditions.push({
            field: fieldName,
            operator: typeof value === 'string' && value.includes('*') ? 'matches' : 'contains',
            value
          });
        }
      }
      
      // Convert frontmatter conditions
      if (parsedQuery.frontmatter) {
        for (const [key, value] of Object.entries(parsedQuery.frontmatter)) {
          conditions.push({
            field: `frontmatter.${key}`,
            operator: typeof value === 'string' ? 'equals' : 'contains',
            value
          });
        }
      }
      
      // Convert content conditions
      if (parsedQuery.content) {
        for (const [key, value] of Object.entries(parsedQuery.content)) {
          // For content searches, we need to handle this differently
          // The indexer doesn't support content search directly
          // We'll need to filter after getting all documents
          conditions.push({
            field: 'content',
            operator: 'contains',
            value
          });
        }
      }
      
      // If no conditions, we still want to return all documents
      // The indexer should handle empty conditions array
      const indexerQuery = {
        conditions: conditions.length > 0 ? conditions : [],
        sort: parsedQuery.sort,
      };
      
      // Execute query using indexer
      let pageMetadata = await indexer.query(indexerQuery);
      
      // Handle content search manually since indexer doesn't support it
      if (parsedQuery.content && Object.keys(parsedQuery.content).length > 0) {
        // If we have content conditions, we need to filter manually
        const contentFilters = Object.entries(parsedQuery.content);
        
        // Filter documents by loading and checking content
        const filteredResults = [];
        for (const page of pageMetadata) {
          try {
            const content = await ctx.fileSystem.readFile(page.path);
            let matches = true;
            
            for (const [, searchValue] of contentFilters) {
              if (typeof searchValue === 'string' && !content.toLowerCase().includes(searchValue.toLowerCase())) {
                matches = false;
                break;
              }
            }
            
            if (matches) {
              filteredResults.push(page);
            }
          } catch (error) {
            // Skip files that can't be read
            console.warn(`Failed to read file for content search: ${page.path}`, error);
          }
        }
        
        pageMetadata = filteredResults;
      }
      
      const executionTime = Date.now() - startTime;
      
      // Convert PageMetadata to Document format
      const documents = pageMetadata.map(page => ({
        path: page.path,
        content: '', // Content not loaded by indexer query
        metadata: {
          name: page.basename,
          modified: new Date(page.mtime),
          size: page.size,
          frontmatter: page.frontmatter,
          tags: page.tags,
          links: [], // TODO: Extract links from page
          backlinks: [], // TODO: Get backlinks
        }
      }));
      
      // Return as DocumentSet metadata
      const docSet = await fromDocuments(documents, {
        limit: 5000,
        overrideLimit: true,
      });
      
      const materializedDocs = await docSet.materialize();
      
      return {
        documents: materializedDocs,
        metadata: {
          totalCount: documents.length,
          query: input,
          executionTime,
        },
      };
    }),

  // Build complex queries
  build: t.procedure
    .input(z.object({
      conditions: z.array(z.object({
        field: z.string(),
        operator: z.enum(['equals', 'contains', 'startsWith', 'endsWith', 'matches']),
        value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
      })),
      sort: z.object({
        field: z.string(),
        order: z.enum(['asc', 'desc']),
      }).optional(),
    }))
    .query(async ({ input }) => {
      // Build query object from conditions
      const query: Record<string, any> = {};
      
      for (const condition of input.conditions) {
        if (condition.operator === 'equals') {
          query[condition.field] = condition.value;
        } else {
          query[condition.field] = { [condition.operator]: condition.value };
        }
      }
      
      if (input.sort) {
        query.sort = input.sort.field;
        query.order = input.sort.order;
      }
      
      return query;
    }),

  // Validate query syntax
  validate: t.procedure
    .input(QueryInputSchema)
    .query(async ({ input, ctx }) => {
      const { queryParser } = ctx;
      
      try {
        const parsed = queryParser.parse(input);
        return {
          valid: true,
          parsed,
          errors: [],
        };
      } catch (error) {
        return {
          valid: false,
          parsed: null,
          errors: [(error as Error).message],
        };
      }
    }),

  // Get recent queries (from memory/cache)
  recent: t.procedure
    .query(async () => {
      // TODO: Implement query history/caching
      return {
        queries: [],
      };
    }),

  // Save a query for reuse
  save: t.procedure
    .input(z.object({
      name: z.string(),
      query: QueryInputSchema,
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // TODO: Implement saved queries
      return {
        id: Date.now().toString(),
        ...input,
        createdAt: new Date().toISOString(),
      };
    }),

  // Get saved queries
  getSaved: t.procedure
    .query(async () => {
      // TODO: Implement saved queries retrieval
      return {
        queries: [],
      };
    }),
});