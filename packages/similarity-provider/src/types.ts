import { z } from 'zod';

// Document schema for indexing
export const DocumentToIndexSchema = z.object({
  id: z.string(),
  path: z.string(),
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  metadata: z.record(z.any()).optional()
});

export type DocumentToIndex = z.infer<typeof DocumentToIndexSchema>;

// Search options schema
export const SearchOptionsSchema = z.object({
  limit: z.number().optional().default(10),
  threshold: z.number().optional().default(0.2),
  filter: z.record(z.any()).optional()
});

export type SearchOptions = z.infer<typeof SearchOptionsSchema>;

// Search result schema
export const SearchResultSchema = z.object({
  id: z.string(),
  path: z.string(),
  score: z.number(),
  content: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

// Indexing result schema
export const IndexingResultSchema = z.object({
  successful: z.number(),
  failed: z.number(),
  errors: z.array(z.object({
    documentId: z.string(),
    path: z.string(),
    error: z.string()
  }))
});

export type IndexingResult = z.infer<typeof IndexingResultSchema>;

// Provider status schema
export const SimilarityStatusSchema = z.object({
  ready: z.boolean(),
  documentCount: z.number(),
  lastIndexed: z.date().optional(),
  error: z.string().optional(),
  provider: z.string()
});

export type SimilarityStatus = z.infer<typeof SimilarityStatusSchema>;

// Configuration schema
export const SimilarityConfigSchema = z.object({
  provider: z.string().default('qdrant'),
  ollamaUrl: z.string().optional(),
  model: z.string().optional(),
  
  // Provider-specific settings
  qdrant: z.object({
    url: z.string().default('http://localhost:6333'),
    collectionName: z.string().default('documents'),
    onDisk: z.boolean().default(false)
  }).optional()
});

export type SimilarityConfig = z.infer<typeof SimilarityConfigSchema>;

// Provider initialization options
export interface ProviderInitOptions {
  config: SimilarityConfig;
  vaultPath: string;
  vaultId: string;
}