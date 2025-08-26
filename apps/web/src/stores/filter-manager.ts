/**
 * Filter Manager - Handles document filtering logic
 * Extracted from document-store.ts to improve maintainability
 */

import type { Document, FilterCondition, FilterCollection } from './types.js';

/**
 * Apply filters to documents
 */
export function applyFilters(
  documents: Document[], 
  filters: FilterCollection, 
  searchQuery?: string,
  searchMode?: 'text' | 'similarity'
): Document[] {
  let filtered = documents;

  // Apply search query first if present
  if (searchQuery && searchMode === 'text') {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(doc => {
      const name = doc.metadata.name.toLowerCase();
      const tags = (doc.metadata.tags || []).join(' ').toLowerCase();
      return name.includes(query) || tags.includes(query);
    });
  }

  // Apply filter conditions
  if (filters.conditions.length > 0) {
    filtered = filtered.filter(doc => {
      const results = filters.conditions.map(condition => 
        evaluateCondition(doc, condition)
      );
      
      return filters.logic === 'OR' 
        ? results.some(r => r)
        : results.every(r => r);
    });
  }

  return filtered;
}

/**
 * Evaluate a single filter condition against a document
 */
function evaluateCondition(doc: Document, condition: FilterCondition): boolean {
  const { field, operator, value, key, caseSensitive } = condition;

  switch (field) {
    case 'name': {
      const name = caseSensitive ? doc.metadata.name : doc.metadata.name.toLowerCase();
      const compareValue = caseSensitive ? value : value.toLowerCase();
      return evaluateTextOperator(name, operator, compareValue);
    }
    
    case 'tags': {
      const tags = doc.metadata.tags || [];
      return evaluateArrayOperator(tags, operator, value);
    }
    
    case 'metadata': {
      const metaValue = key ? doc.metadata.frontmatter?.[key] : undefined;
      return String(metaValue) === String(value);
    }
    
    case 'modified': {
      const date = new Date(doc.metadata.modified);
      return evaluateDateOperator(date, operator, value);
    }
    
    case 'size': {
      return evaluateNumberOperator(doc.metadata.size, operator, value);
    }
    
    default:
      return false;
  }
}

/**
 * Evaluate text-based operators
 */
function evaluateTextOperator(text: string, operator: string, value: string): boolean {
  switch (operator) {
    case 'contains':
      return text.includes(value);
    case 'not_contains':
      return !text.includes(value);
    case 'equals':
      return text === value;
    case 'not_equals':
      return text !== value;
    case 'starts_with':
      return text.startsWith(value);
    case 'ends_with':
      return text.endsWith(value);
    default:
      return false;
  }
}

/**
 * Evaluate array-based operators
 */
function evaluateArrayOperator(array: string[], operator: string, values: string[]): boolean {
  switch (operator) {
    case 'contains':
      return values.every(v => array.includes(v));
    case 'not_contains':
      return !values.some(v => array.includes(v));
    case 'contains_any':
      return values.some(v => array.includes(v));
    default:
      return false;
  }
}

/**
 * Evaluate date-based operators
 */
function evaluateDateOperator(date: Date, operator: string, value: string | Date | { min: Date; max: Date }): boolean {
  switch (operator) {
    case 'before':
      return date < new Date(value);
    case 'after':
      return date > new Date(value);
    case 'between': {
      const { from, to } = value;
      return date >= new Date(from) && date <= new Date(to);
    }
    default:
      return false;
  }
}

/**
 * Evaluate number-based operators
 */
function evaluateNumberOperator(num: number, operator: string, value: number | { min: number; max: number }): boolean {
  switch (operator) {
    case 'equals':
      return num === value;
    case 'not_equals':
      return num !== value;
    case 'gt':
      return num > value;
    case 'gte':
      return num >= value;
    case 'lt':
      return num < value;
    case 'lte':
      return num <= value;
    case 'between': {
      const { from, to } = value;
      return num >= from && num <= to;
    }
    default:
      return false;
  }
}

/**
 * Clear all filters
 */
export function clearFilters(): FilterCollection {
  return {
    conditions: [],
    logic: 'AND'
  };
}

/**
 * Add or update a filter condition
 */
export function updateFilterCondition(
  filters: FilterCollection,
  condition: FilterCondition
): FilterCollection {
  const existingIndex = filters.conditions.findIndex(
    c => c.field === condition.field && c.key === condition.key
  );
  
  const newConditions = existingIndex >= 0
    ? filters.conditions.map((c, i) => i === existingIndex ? condition : c)
    : [...filters.conditions, condition];
  
  return {
    ...filters,
    conditions: newConditions
  };
}

/**
 * Remove a filter condition
 */
export function removeFilterCondition(
  filters: FilterCollection,
  field: string,
  key?: string
): FilterCollection {
  return {
    ...filters,
    conditions: filters.conditions.filter(
      c => !(c.field === field && c.key === key)
    )
  };
}