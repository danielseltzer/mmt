/**
 * Executes queries against the index
 */

import type { Query, QueryCondition, PageMetadata } from './types.js';
import type { IndexStorage } from './index-storage.js';
import { minimatch } from 'minimatch';

export class QueryExecutor {
  constructor(private storage: IndexStorage) {}
  
  /**
   * Execute a query and return matching documents
   */
  execute(query: Query): PageMetadata[] {
    // Start with all documents or use optimized path if possible
    let results = this.getInitialSet(query);
    
    // Apply each condition
    for (const condition of query.conditions) {
      results = this.applyCondition(results, condition);
      
      // Short circuit if no results
      if (results.length === 0) {break;}
    }
    
    // Apply sorting if requested
    if (query.sort) {
      results = this.sortResults(results, query.sort);
    }
    
    // Apply limit if requested
    if (query.limit && query.limit > 0) {
      results = results.slice(0, query.limit);
    }
    
    return results;
  }
  
  /**
   * Get initial set of documents based on query optimization
   */
  private getInitialSet(query: Query): PageMetadata[] {
    // Look for conditions we can optimize
    for (const condition of query.conditions) {
      // Tag queries can use index
      if (condition.field === 'tag' && condition.operator === 'equals') {
        return this.storage.getDocumentsByTag(String(condition.value));
      }
      
      // Path prefix queries can use prefix tree
      if (condition.field === 'fs:path' && condition.operator === 'matches') {
        const value = String(condition.value);
        // For simple prefix patterns like "folder/*", use prefix tree
        if (value.endsWith('/*')) {
          const prefix = value.slice(0, -2); // Remove /*
          const results = this.storage.getDocumentsByPathPrefix(prefix);
          // If no results from prefix tree, don't short-circuit
          if (results.length > 0) {
            return results;
          }
        }
      }
      
      // Frontmatter property queries can use property index
      if (condition.field.startsWith('fm:') && condition.operator === 'equals') {
        const property = condition.field.substring(3);
        return this.storage.getDocumentsByProperty(property, condition.value);
      }
    }
    
    // No optimization possible, start with all documents
    return this.storage.getAllDocuments();
  }
  
  /**
   * Apply a single condition to filter results
   */
  private applyCondition(docs: PageMetadata[], condition: QueryCondition): PageMetadata[] {
    return docs.filter(doc => this.matchesCondition(doc, condition));
  }
  
  /**
   * Check if a document matches a condition
   */
  private matchesCondition(doc: PageMetadata, condition: QueryCondition): boolean {
    const { field, operator, value } = condition;
    
    // Handle different field types
    if (field.startsWith('fm:')) {
      // Frontmatter field
      const property = field.substring(3);
      const docValue = doc.frontmatter[property];
      return this.compareValues(docValue, operator, value);
    }
    
    if (field.startsWith('fs:')) {
      // Filesystem field
      const property = field.substring(3);
      switch (property) {
        case 'path':
          return this.compareValues(doc.relativePath, operator, value);
        case 'name':
          return this.compareValues(doc.basename, operator, value);
        case 'size':
          return this.compareValues(doc.size, operator, value);
        case 'mtime':
          return this.compareValues(doc.mtime, operator, value);
        default:
          return false;
      }
    }
    
    // Direct field access
    switch (field) {
      case 'tag':
        return this.matchesTag(doc, operator, value);
      case 'title':
        return this.compareValues(doc.title, operator, value);
      case 'content': {
        // Since we don't store content in metadata, search across
        // multiple text fields that users would expect to match
        const searchValue = String(value).toLowerCase();
        
        // Search in title
        if (doc.title.toLowerCase().includes(searchValue)) {
          return true;
        }
        
        // Search in basename
        if (doc.basename.toLowerCase().includes(searchValue)) {
          return true;
        }
        
        // Search in path
        if (doc.relativePath.toLowerCase().includes(searchValue)) {
          return true;
        }
        
        // Search in aliases
        if (doc.aliases.some(alias => alias.toLowerCase().includes(searchValue))) {
          return true;
        }
        
        // Search in tags
        if (doc.tags.some(tag => tag.toLowerCase().includes(searchValue))) {
          return true;
        }
        
        return false;
      }
      default:
        return false;
    }
  }
  
  /**
   * Compare values based on operator
   */
  private compareValues(docValue: unknown, operator: string, queryValue: unknown): boolean {
    switch (operator) {
      case 'equals':
        return docValue === queryValue;
      
      case 'contains':
        if (typeof docValue === 'string' && typeof queryValue === 'string') {
          return docValue.toLowerCase().includes(queryValue.toLowerCase());
        }
        if (Array.isArray(docValue)) {
          return docValue.includes(queryValue);
        }
        return false;
      
      case 'matches':
        if (typeof docValue === 'string' && typeof queryValue === 'string') {
          return minimatch(docValue, queryValue);
        }
        return false;
      
      case 'exists':
        return docValue !== undefined && docValue !== null;
      
      case 'not-exists':
        return docValue === undefined || docValue === null;
      
      default:
        return false;
    }
  }
  
  /**
   * Check if document matches tag condition
   */
  private matchesTag(doc: PageMetadata, operator: string, value: unknown): boolean {
    const tagValue = String(value).toLowerCase();
    
    switch (operator) {
      case 'equals':
        return doc.tags.includes(tagValue);
      case 'contains':
        return doc.tags.some(tag => tag.includes(tagValue));
      case 'exists':
        return doc.tags.length > 0;
      case 'not-exists':
        return doc.tags.length === 0;
      default:
        return false;
    }
  }
  
  /**
   * Sort results by field
   */
  private sortResults(docs: PageMetadata[], sort: { field: string; order: 'asc' | 'desc' }): PageMetadata[] {
    const { field, order } = sort;
    
    return [...docs].sort((a, b) => {
      let aValue = this.getFieldValue(a, field);
      let bValue = this.getFieldValue(b, field);
      
      // Handle different types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      let result = 0;
      // Type-safe comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        result = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        result = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        result = aValue.getTime() - bValue.getTime();
      }
      
      return order === 'asc' ? result : -result;
    });
  }
  
  /**
   * Get field value from document
   */
  private getFieldValue(doc: PageMetadata, field: string): unknown {
    if (field.startsWith('fm:')) {
      return doc.frontmatter[field.substring(3)];
    }
    
    switch (field) {
      case 'title':
        return doc.title;
      case 'path':
        return doc.relativePath;
      case 'mtime':
        return doc.mtime;
      case 'size':
        return doc.size;
      default:
        return '';
    }
  }
}