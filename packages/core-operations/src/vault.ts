/**
 * @fileoverview Core vault implementation
 */

import { join, relative, extname, basename } from 'node:path';
import type { 
  Vault, 
  VaultContext, 
  Document, 
  DocumentSet,
  Query,
  StructuredQuery,
  VaultIndex,
} from '@mmt/entities';
import { 
  parseQuery,
  VaultSchema,
  DocumentSchema,
  VaultContextSchema,
} from '@mmt/entities';
import { NodeFileSystem, type FileSystemAccess } from '@mmt/filesystem-access';
import { minimatch } from 'minimatch';

/**
 * Load a vault from filesystem
 */
export async function loadVault(
  basePath: string,
  fs: FileSystemAccess = new NodeFileSystem()
): Promise<Vault> {
  const documents = new Map<string, Document>();
  const index: VaultIndex = {
    byTag: new Map(),
    byPath: new Map(),
    links: new Map(),
    backlinks: new Map(),
  };
  
  // Recursively find all markdown files
  async function scanDirectory(dir: string): Promise<void> {
    const entries = await fs.readdir(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (stats.isFile() && extname(entry) === '.md') {
        // Load document
        const { content, frontmatter } = await fs.readMarkdownFile(fullPath);
        const relativePath = relative(basePath, fullPath);
        const name = basename(fullPath, '.md');
        
        // Extract metadata
        const metadata = {
          name,
          modified: stats.mtime,
          size: stats.size,
          frontmatter: frontmatter || {},
          tags: extractTags(frontmatter),
          links: extractLinks(content),
        };
        
        const doc: Document = {
          path: fullPath,
          content,
          metadata,
        };
        
        documents.set(fullPath, doc);
        
        // Update indices
        updateIndices(index, doc, relativePath);
      }
    }
  }
  
  await scanDirectory(basePath);
  
  return VaultSchema.parse({
    basePath,
    documents,
    index,
  });
}

/**
 * Extract tags from frontmatter
 */
function extractTags(frontmatter: Record<string, unknown>): string[] {
  const tags = frontmatter.tags;
  if (Array.isArray(tags)) {
    return tags.filter((t): t is string => typeof t === 'string');
  }
  return [];
}

/**
 * Extract wiki-links from content
 */
function extractLinks(content: string): string[] {
  const linkPattern = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;
  
  while ((match = linkPattern.exec(content)) !== null) {
    links.push(match[1]);
  }
  
  return links;
}

/**
 * Extract inline tags from content
 */
function extractInlineTags(content: string): string[] {
  const tagPattern = /#([a-zA-Z0-9_-]+)/g;
  const tags: string[] = [];
  let match;
  
  while ((match = tagPattern.exec(content)) !== null) {
    tags.push(`#${match[1]}`);
  }
  
  return tags;
}

/**
 * Update vault indices
 */
function updateIndices(
  index: VaultIndex,
  doc: Document,
  relativePath: string
): void {
  // Update tag index
  doc.metadata.tags.forEach(tag => {
    const paths = index.byTag.get(tag) || [];
    paths.push(doc.path);
    index.byTag.set(tag, paths);
  });
  
  // Update path index
  const pathParts = relativePath.split('/');
  for (let i = 0; i < pathParts.length - 1; i++) {
    const partial = pathParts.slice(0, i + 1).join('/');
    const paths = index.byPath.get(partial) || [];
    paths.push(doc.path);
    index.byPath.set(partial, paths);
  }
  
  // Update links index
  if (doc.metadata.links.length > 0) {
    index.links.set(doc.path, doc.metadata.links);
  }
}

/**
 * Create a vault context for fluent operations
 */
export function createVaultContext(vault: Vault): VaultContext {
  return new VaultContextImpl(vault);
}

/**
 * Implementation of VaultContext fluent API
 */
class VaultContextImpl implements VaultContext {
  vault: Vault;
  selection: DocumentSet;
  pendingOperations: any[] = [];
  
  constructor(vault: Vault, selection?: DocumentSet) {
    this.vault = vault;
    this.selection = selection || {
      id: generateId(),
      documents: [],
      source: undefined,
    };
  }
  
  select(query: Query): VaultContext {
    const structured = parseQuery(query);
    const documents = Array.from(this.vault.documents.values());
    const filtered = documents.filter(doc => matchesQuery(doc, structured, this.vault.basePath));
    
    return new VaultContextImpl(this.vault, {
      id: generateId(),
      documents: filtered,
      source: query,
    });
  }
  
  filter(predicate: (doc: Document) => boolean): VaultContext {
    const filtered = this.selection.documents.filter(predicate);
    
    return new VaultContextImpl(this.vault, {
      id: generateId(),
      documents: filtered,
      source: this.selection.source,
    });
  }
  
  union(other: VaultContext): VaultContext {
    const combined = new Map<string, Document>();
    
    // Add all from this selection
    this.selection.documents.forEach(doc => {
      combined.set(doc.path, doc);
    });
    
    // Add all from other selection
    other.selection.documents.forEach(doc => {
      combined.set(doc.path, doc);
    });
    
    return new VaultContextImpl(this.vault, {
      id: generateId(),
      documents: Array.from(combined.values()),
      source: undefined,
    });
  }
  
  intersect(other: VaultContext): VaultContext {
    const otherPaths = new Set(other.selection.documents.map(d => d.path));
    const intersection = this.selection.documents.filter(doc => 
      otherPaths.has(doc.path)
    );
    
    return new VaultContextImpl(this.vault, {
      id: generateId(),
      documents: intersection,
      source: undefined,
    });
  }
  
  difference(other: VaultContext): VaultContext {
    const otherPaths = new Set(other.selection.documents.map(d => d.path));
    const difference = this.selection.documents.filter(doc => 
      !otherPaths.has(doc.path)
    );
    
    return new VaultContextImpl(this.vault, {
      id: generateId(),
      documents: difference,
      source: undefined,
    });
  }
  
  // Placeholder for operations we'll implement next
  move(destination: string): VaultContext {
    throw new Error('Not implemented yet');
  }
  
  mergeMetadata(updates: Record<string, unknown>): VaultContext {
    throw new Error('Not implemented yet');
  }
  
  replaceMetadata(metadata: Record<string, unknown>): VaultContext {
    throw new Error('Not implemented yet');
  }
  
  removeMetadata(keys: string | string[]): VaultContext {
    throw new Error('Not implemented yet');
  }
  
  transformMetadata(fn: (fm: Record<string, unknown>) => Record<string, unknown>): VaultContext {
    throw new Error('Not implemented yet');
  }
  
  async execute(): Promise<any> {
    throw new Error('Not implemented yet');
  }
}

/**
 * Check if document matches structured query
 */
function matchesQuery(
  doc: Document,
  query: StructuredQuery,
  basePath: string
): boolean {
  // Filesystem queries
  if (query.filesystem) {
    const fs = query.filesystem;
    const relativePath = relative(basePath, doc.path);
    
    if (fs.path) {
      const matches = matchesOperator(relativePath, fs.path, (val, pattern) => {
        // Handle glob patterns
        if (typeof pattern === 'string' && typeof val === 'string') {
          return minimatch(val, pattern, { matchBase: true });
        }
        return false;
      });
      if (!matches) {
        return false;
      }
    }
    
    if (fs.name && !matchesOperator(doc.metadata.name, fs.name)) {
      return false;
    }
  }
  
  // Frontmatter queries
  if (query.frontmatter) {
    for (const [key, operator] of Object.entries(query.frontmatter)) {
      const value = doc.metadata.frontmatter[key];
      if (!matchesOperator(value, operator)) {
        return false;
      }
    }
  }
  
  // Content queries
  if (query.content) {
    if (query.content.text) {
      const searchText = query.content.text.toLowerCase();
      if (!doc.content.toLowerCase().includes(searchText)) {
        return false;
      }
    }
    
    if (query.content.regex) {
      const regex = new RegExp(query.content.regex);
      if (!regex.test(doc.content)) {
        return false;
      }
    }
  }
  
  // Inline queries
  if (query.inline) {
    if (query.inline.tags) {
      const inlineTags = extractInlineTags(doc.content);
      if (!matchesOperator(inlineTags, query.inline.tags)) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Match value against query operator
 */
function matchesOperator(
  value: unknown,
  operator: any,
  customMatcher?: (val: any, pattern: any) => boolean
): boolean {
  // Use custom matcher first if provided and operator is string
  if (customMatcher && typeof operator === 'string') {
    return customMatcher(value, operator);
  }
  
  // Direct equality
  if (typeof operator === 'string' || 
      typeof operator === 'number' || 
      typeof operator === 'boolean') {
    return value === operator;
  }
  
  // Array operators
  if (Array.isArray(operator)) {
    return Array.isArray(value) && 
           operator.every(item => value.includes(item));
  }
  
  // Complex operators
  if (typeof operator === 'object' && operator !== null) {
    if (operator.$contains && Array.isArray(value)) {
      return value.includes(operator.$contains);
    }
    
    if (operator.$containsAll && Array.isArray(value)) {
      return operator.$containsAll.every((item: any) => 
        value.includes(item)
      );
    }
    
    if (operator.$containsAny && Array.isArray(value)) {
      return operator.$containsAny.some((item: any) => 
        value.includes(item)
      );
    }
    
    if (operator.$exists !== undefined) {
      return operator.$exists ? value !== undefined : value === undefined;
    }
    
    // Use custom matcher if provided
    if (customMatcher) {
      return customMatcher(value, operator);
    }
  }
  
  return false;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}