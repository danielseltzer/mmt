/**
 * Multi-index storage for efficient querying
 * Implements the architecture from ADR-008
 */

import type { PageMetadata, LinkEntry } from './types.js';
import { PrefixIndex } from './prefix-index.js';

export class IndexStorage {
  // Primary storage - all document metadata
  private pages = new Map<string, PageMetadata>();
  
  // Secondary indices for query performance
  private tags = new Map<string, Set<string>>(); // tag -> file paths
  private etags = new Map<string, Set<string>>(); // exact tag -> file paths  
  private titles = new Map<string, string>(); // normalized title -> path
  private prefixTree = new PrefixIndex(); // for path queries
  
  // Link indices
  private outgoingLinks = new Map<string, LinkEntry[]>(); // source -> targets
  private incomingLinks = new Map<string, Set<string>>(); // target -> sources
  
  // Frontmatter property index
  private properties = new Map<string, Map<unknown, Set<string>>>(); // property -> value -> paths
  
  // Change tracking
  private revision = 0;
  
  /**
   * Get current revision number
   */
  getRevision(): number {
    return this.revision;
  }
  
  /**
   * Increment revision (indicates index changed)
   */
  private touch(): void {
    this.revision++;
  }
  
  /**
   * Clear all stored data
   */
  clear(): void {
    this.pages.clear();
    this.tags.clear();
    this.etags.clear();
    this.titles.clear();
    this.prefixTree = new PrefixIndex();
    this.outgoingLinks.clear();
    this.incomingLinks.clear();
    this.properties.clear();
    this.touch();
  }
  
  /**
   * Add or update a document in the index
   */
  addDocument(metadata: PageMetadata): void {
    const {path} = metadata;
    
    // Remove old data if updating
    if (this.pages.has(path)) {
      this.removeFromIndices(path);
    }
    
    // Store in primary index
    this.pages.set(path, metadata);
    
    // Update secondary indices
    this.indexTags(path, metadata);
    this.indexTitle(path, metadata);
    this.indexPath(path, metadata);
    this.indexProperties(path, metadata);
    
    this.touch();
  }
  
  /**
   * Remove a document from all indices
   */
  removeDocument(path: string): void {
    if (!this.pages.has(path)) {return;}
    
    this.removeFromIndices(path);
    this.pages.delete(path);
    
    // Remove from link indices
    this.outgoingLinks.delete(path);
    
    // Remove as target from incoming links
    for (const [, sources] of this.incomingLinks) {
      sources.delete(path);
    }
    
    this.touch();
  }
  
  /**
   * Get a document by path
   */
  getDocument(path: string): PageMetadata | undefined {
    return this.pages.get(path);
  }
  
  /**
   * Get all documents
   */
  getAllDocuments(): PageMetadata[] {
    return Array.from(this.pages.values());
  }
  
  /**
   * Get documents by tag
   */
  getDocumentsByTag(tag: string): PageMetadata[] {
    const normalizedTag = tag.toLowerCase();
    const paths = this.tags.get(normalizedTag) ?? new Set();
    return this.getDocumentsByPaths(paths);
  }
  
  /**
   * Get documents by exact tag
   */
  getDocumentsByExactTag(tag: string): PageMetadata[] {
    const paths = this.etags.get(tag) ?? new Set();
    return this.getDocumentsByPaths(paths);
  }
  
  /**
   * Get documents by path prefix
   */
  getDocumentsByPathPrefix(prefix: string): PageMetadata[] {
    const paths = this.prefixTree.find(prefix);
    return this.getDocumentsByPaths(paths);
  }
  
  /**
   * Get documents by frontmatter property
   */
  getDocumentsByProperty(property: string, value: unknown): PageMetadata[] {
    const propertyIndex = this.properties.get(property);
    if (!propertyIndex) {return [];}
    
    const paths = propertyIndex.get(value) ?? new Set();
    return this.getDocumentsByPaths(paths);
  }
  
  /**
   * Update link information for a document
   */
  updateLinks(sourcePath: string, links: LinkEntry[]): void {
    // Remove old links
    const oldLinks = this.outgoingLinks.get(sourcePath) ?? [];
    for (const link of oldLinks) {
      const targetSources = this.incomingLinks.get(link.target);
      if (targetSources) {
        targetSources.delete(sourcePath);
      }
    }
    
    // Add new links
    this.outgoingLinks.set(sourcePath, links);
    
    for (const link of links) {
      if (!this.incomingLinks.has(link.target)) {
        this.incomingLinks.set(link.target, new Set());
      }
      const targetSources = this.incomingLinks.get(link.target);
      if (targetSources) {
        targetSources.add(sourcePath);
      }
    }
    
    this.touch();
  }
  
  /**
   * Get outgoing links from a document
   */
  getOutgoingLinks(path: string): LinkEntry[] {
    return this.outgoingLinks.get(path) ?? [];
  }
  
  /**
   * Get documents that link to a given document
   */
  getBacklinks(targetPath: string): string[] {
    const sources = this.incomingLinks.get(targetPath) ?? new Set();
    return Array.from(sources);
  }
  
  /**
   * Remove a document from all secondary indices
   */
  private removeFromIndices(path: string): void {
    const metadata = this.pages.get(path);
    if (!metadata) {return;}
    
    // Remove from tag indices
    for (const tag of metadata.tags) {
      this.tags.get(tag)?.delete(path);
    }
    
    for (const tag of metadata.etags) {
      this.etags.get(tag)?.delete(path);
    }
    
    // Remove from title index
    const normalizedTitle = this.normalizeTitle(metadata.title);
    if (this.titles.get(normalizedTitle) === path) {
      this.titles.delete(normalizedTitle);
    }
    
    // Remove from prefix tree
    this.prefixTree.remove(metadata.relativePath);
    
    // Remove from property indices
    for (const [key, value] of Object.entries(metadata.frontmatter)) {
      const propertyIndex = this.properties.get(key);
      if (propertyIndex) {
        propertyIndex.get(value)?.delete(path);
      }
    }
  }
  
  /**
   * Index tags for a document
   */
  private indexTags(path: string, metadata: PageMetadata): void {
    // Index normalized tags
    for (const tag of metadata.tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      const tagPaths = this.tags.get(tag);
      if (tagPaths) {
        tagPaths.add(path);
      }
    }
    
    // Index exact tags
    for (const tag of metadata.etags) {
      if (!this.etags.has(tag)) {
        this.etags.set(tag, new Set());
      }
      const etagPaths = this.etags.get(tag);
      if (etagPaths) {
        etagPaths.add(path);
      }
    }
  }
  
  /**
   * Index title for a document
   */
  private indexTitle(path: string, metadata: PageMetadata): void {
    const normalized = this.normalizeTitle(metadata.title);
    this.titles.set(normalized, path);
    
    // Also index aliases
    for (const alias of metadata.aliases) {
      const normalizedAlias = this.normalizeTitle(alias);
      if (!this.titles.has(normalizedAlias)) {
        this.titles.set(normalizedAlias, path);
      }
    }
  }
  
  /**
   * Index path in prefix tree
   */
  private indexPath(path: string, metadata: PageMetadata): void {
    this.prefixTree.add(metadata.relativePath);
  }
  
  /**
   * Index frontmatter properties
   */
  private indexProperties(path: string, metadata: PageMetadata): void {
    for (const [key, value] of Object.entries(metadata.frontmatter)) {
      if (!this.properties.has(key)) {
        this.properties.set(key, new Map());
      }
      
      const propertyIndex = this.properties.get(key);
      if (!propertyIndex) {
        continue;
      }
      if (!propertyIndex.has(value)) {
        propertyIndex.set(value, new Set());
      }
      
      const valuePaths = propertyIndex.get(value);
      if (valuePaths) {
        valuePaths.add(path);
      }
    }
  }
  
  /**
   * Normalize title for case-insensitive matching
   */
  private normalizeTitle(title: string): string {
    return title.toLowerCase().trim();
  }
  
  /**
   * Get documents by a set of paths
   */
  private getDocumentsByPaths(paths: Set<string>): PageMetadata[] {
    const docs: PageMetadata[] = [];
    
    for (const path of paths) {
      const doc = this.pages.get(path);
      if (doc) {
        docs.push(doc);
      }
    }
    
    return docs;
  }
}