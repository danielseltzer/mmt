/**
 * Core types for the indexer package
 */

/**
 * Metadata for an indexed page/document
 * Adapted from Dataview's PageMetadata
 */
export interface PageMetadata {
  // File identification
  path: string; // Absolute path
  relativePath: string; // Relative to vault root
  basename: string; // Filename without extension
  
  // Content metadata
  title: string; // From first H1 or filename
  aliases: string[]; // From frontmatter aliases field
  
  // Timestamps and stats
  ctime: number; // Created time (ms since epoch)
  mtime: number; // Modified time (ms since epoch)
  size: number; // File size in bytes
  
  // Extracted metadata
  tags: string[]; // All tags (normalized, includes hierarchy)
  etags: string[]; // Exact tags as written
  frontmatter: Record<string, unknown>; // All frontmatter fields
  
  // Content structure
  headings: Heading[]; // Document outline
  lists: number; // Number of list items
  tasks: number; // Number of tasks (- [ ])
  
  // For change detection
  hash: string; // Content hash for change detection
}

/**
 * Heading structure in a document
 */
export interface Heading {
  level: number; // 1-6
  text: string; // Heading text
  slug: string; // URL-safe slug
}

/**
 * Link information
 */
export interface LinkEntry {
  source: string; // Source file path
  target: string; // Target file path (resolved)
  display?: string; // Display text for the link
  type: 'wikilink' | 'markdown';
  position: {
    start: number;
    end: number;
  };
}

/**
 * Cache entry for persistent storage
 */
export interface CacheEntry {
  metadata: PageMetadata;
  version: string; // Cache schema version
  indexed: number; // When this was indexed (timestamp)
}

/**
 * Options for creating indexer
 */
export interface IndexerOptions {
  vaultPath: string;
  fileSystem: import('@mmt/filesystem-access').FileSystemAccess;
  useCache?: boolean; // Enable persistent caching
  useWorkers?: boolean; // Enable worker threads
  cacheDir?: string; // Where to store cache
  workerCount?: number; // Number of worker threads
  fileWatching?: {
    enabled: boolean;
    debounceMs?: number;
    ignorePatterns?: string[];
  };
}

/**
 * Query condition for filtering documents
 */
export interface QueryCondition {
  field: string; // e.g., 'fm:status', 'fs:path'
  operator: 'equals' | 'contains' | 'matches' | 'exists' | 'not-exists';
  value?: unknown; // Value to compare against
}

/**
 * Query object
 */
export interface Query {
  conditions: QueryCondition[];
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  limit?: number;
}

/**
 * Bidirectional link cache
 */
export interface LinkCache {
  // Outgoing links: source -> targets
  links: Map<string, LinkEntry[]>;
  
  // Incoming links: target -> sources
  reverseLinks: Map<string, Set<string>>;
}

/**
 * Result of parsing a file
 */
export interface ParseResult {
  metadata: PageMetadata;
  links: LinkEntry[];
  error?: Error;
}