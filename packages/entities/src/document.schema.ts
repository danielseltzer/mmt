/**
 * @fileoverview Document-related schemas for markdown file representation.
 * 
 * This file defines the core data structures for representing markdown documents
 * in MMT. Documents are the fundamental unit of content, containing both the
 * file content and associated metadata.
 */

import { z } from 'zod';

/**
 * Base metadata fields shared across document representations.
 * 
 * This schema defines the common metadata extracted from all markdown files,
 * regardless of how they're accessed or displayed. It includes both filesystem
 * metadata and parsed content metadata.
 */
export const BaseDocumentMetadataSchema = z.object({
  /** File name without extension (e.g., "my-note" from "my-note.md") */
  name: z.string().describe('File name without extension'),
  
  /** Last modification timestamp from the filesystem */
  modified: z.date().describe('Last modified date'),
  
  /** File size in bytes */
  size: z.number().describe('File size in bytes'),
  
  /** Parsed YAML frontmatter as key-value pairs */
  frontmatter: z.record(z.unknown()).default({}).describe('Parsed frontmatter'),
  
  /** Tags extracted from frontmatter and inline #tags */
  tags: z.array(z.string()).default([]).describe('Extracted tags'),
  
  /** Outgoing links to other documents (wiki-links and markdown links) */
  links: z.array(z.string()).default([]).describe('Outgoing links'),
  
  /** Incoming links from other documents (backlinks) */
  backlinks: z.array(z.string()).default([]).describe('Incoming links').optional(),
});

export type BaseDocumentMetadata = z.infer<typeof BaseDocumentMetadataSchema>;

/**
 * Extended metadata including file paths for indexed documents.
 * 
 * Used by the indexer to track documents with their location information.
 * This schema extends BaseDocumentMetadata with path information needed
 * for file operations and link resolution.
 */
export const DocumentMetadataSchema = BaseDocumentMetadataSchema.extend({
  /** Absolute filesystem path to the document */
  path: z.string().describe('Absolute file path'),
  
  /** Path relative to the vault root (e.g., "notes/daily/2024-01-01.md") */
  relativePath: z.string().describe('Path relative to vault'),
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

/**
 * Complete document representation including content.
 * 
 * This schema represents a full document with its content and metadata.
 * Used when operations need to read or modify document content, not just
 * query metadata.
 * 
 * @example
 * ```typescript
 * const doc: Document = {
 *   path: '/vault/notes/example.md',
 *   content: '# Example\n\nThis is the content...',
 *   metadata: {
 *     name: 'example',
 *     modified: new Date('2024-01-01'),
 *     size: 1234,
 *     frontmatter: { tags: ['example'] },
 *     tags: ['example'],
 *     links: ['other-note.md']
 *   }
 * };
 * ```
 */
export const DocumentSchema = z.object({
  /** Absolute path to the document file */
  path: z.string().describe('Absolute file path'),
  
  /** Raw markdown content including frontmatter */
  content: z.string().describe('Raw markdown content'),
  
  /** Parsed metadata (uses BaseDocumentMetadata, not the extended version) */
  metadata: BaseDocumentMetadataSchema.describe('Document metadata'),
});

export type Document = z.infer<typeof DocumentSchema>;

