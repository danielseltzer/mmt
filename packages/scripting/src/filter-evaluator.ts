import type { Document, FilterCollection, FilterCondition } from '@mmt/entities';

/**
 * Evaluates filter conditions against documents.
 * Extracted from ScriptRunner to reduce file size and improve maintainability.
 */
export class FilterEvaluator {
  /**
   * Apply a collection of filters to documents.
   */
  applyFilters(documents: Document[], filterCollection: FilterCollection): Document[] {
    return documents.filter(doc => {
      const results = filterCollection.conditions.map(condition => 
        this.evaluateFilter(doc, condition)
      );
      
      // Apply logic (AND/OR)
      if (filterCollection.logic === 'OR') {
        return results.some(r => r);
      } 
        // Default to AND
        return results.every(r => r);
      
    });
  }

  /**
   * Evaluate a single filter condition against a document.
   */
  private evaluateFilter(doc: Document, filter: FilterCondition): boolean {
    const { field, operator, value } = filter;
    const caseSensitive = (filter as any).caseSensitive ?? false;
    
    switch (field) {
      case 'name':
      case 'content':
      case 'search': {
        const text = this.getSearchableText(doc, field);
        return this.evaluateTextOperator(text, operator, value, caseSensitive);
      }
      
      
      case 'folders': {
        const docFolder = doc.path.substring(0, doc.path.lastIndexOf('/'));
        if (operator === 'in') {
          return (value).some((folder: string) => docFolder.startsWith(folder));
        } 
          // not_in
          return !(value).some((folder: string) => docFolder.startsWith(folder));
        
      }
      
      case 'tags': {
        const tags = doc.metadata?.tags ?? [];
        return this.evaluateArrayOperator(tags, operator, value);
      }
      
      case 'metadata': {
        // Custom metadata field filtering
        const metaKey = (filter as any).key;
        const metaValue = metaKey ? doc.metadata?.frontmatter?.[metaKey] : undefined;
        // For metadata, the operator is always 'equals' in the schema
        return String(metaValue) === String(value);
      }
      
      case 'modified':
      case 'created': {
        // Note: created date is not available in the current document schema
        if (field === 'created') {
          // Created date filtering is not supported
          return false;
        }
        const date = doc.metadata?.modified ? new Date(doc.metadata.modified) : new Date(0);
        return this.evaluateDateOperator(date, operator, value as string | number | { from: string; to: string });
      }
      
      case 'size': {
        const size = doc.metadata?.size ?? 0;
        return this.evaluateNumberOperator(size, operator, value as number | { from: number; to: number });
      }
      
      default:
        // For unknown fields, treat as false (no match)
        return false;
    }
  }

  /**
   * Get searchable text from a document based on field type.
   */
  private getSearchableText(doc: Document, field: 'name' | 'content' | 'search'): string {
    switch (field) {
      case 'name':
        return doc.metadata?.name ?? '';
      case 'content':
        return doc.content ?? '';
      case 'search':
        // Search across multiple fields
        return [
          doc.metadata?.name ?? '',
          doc.content ?? '',
          doc.path ?? '',
          (doc.metadata?.tags ?? []).join(' ')
        ].join(' ');
      default:
        return '';
    }
  }

  /**
   * Evaluate text-based operators.
   */
  private evaluateTextOperator(text: string, operator: string, value: string, caseSensitive = false): boolean {
    const compareText = caseSensitive ? text : text.toLowerCase();
    const compareValue = caseSensitive ? value : value.toLowerCase();
    
    switch (operator) {
      case 'contains':
        return compareText.includes(compareValue);
      case 'not_contains':
        return !compareText.includes(compareValue);
      case 'starts_with':
        return compareText.startsWith(compareValue);
      case 'ends_with':
        return compareText.endsWith(compareValue);
      case 'equals':
        return compareText === compareValue;
      case 'not_equals':
        return compareText !== compareValue;
      case 'matches':
        // Regex match
        try {
          const regex = new RegExp(value, caseSensitive ? 'g' : 'gi');
          return regex.test(text);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * Evaluate array-based operators (for tags).
   */
  private evaluateArrayOperator(array: string[], operator: string, values: string[]): boolean {
    switch (operator) {
      case 'contains':
        // Array contains all specified values
        return values.every(v => array.includes(v));
      case 'not_contains':
        // Array doesn't contain any of the specified values
        return !values.some(v => array.includes(v));
      case 'any_of':
        // Array contains at least one of the specified values
        return values.some(v => array.includes(v));
      default:
        return false;
    }
  }

  /**
   * Evaluate date-based operators.
   */
  private evaluateDateOperator(date: Date, operator: string, value: string | number | { from: string; to: string }): boolean {
    switch (operator) {
      case 'before': {
        const compareDate = new Date(value as string);
        return date < compareDate;
      }
      case 'after': {
        const compareDate = new Date(value as string);
        return date > compareDate;
      }
      case 'between': {
        const range = value as { from: string; to: string };
        const fromDate = new Date(range.from);
        const toDate = new Date(range.to);
        return date >= fromDate && date <= toDate;
      }
      case 'days_ago': {
        const daysAgo = value as number;
        const compareDate = new Date();
        compareDate.setDate(compareDate.getDate() - daysAgo);
        return date >= compareDate;
      }
      default:
        return false;
    }
  }

  /**
   * Evaluate number-based operators.
   */
  private evaluateNumberOperator(num: number, operator: string, value: number | { from: number; to: number }): boolean {
    switch (operator) {
      case 'equals':
        return num === (value as number);
      case 'not_equals':
        return num !== (value as number);
      case 'greater_than':
        return num > (value as number);
      case 'less_than':
        return num < (value as number);
      case 'between': {
        const range = value as { from: number; to: number };
        return num >= range.from && num <= range.to;
      }
      default:
        return false;
    }
  }
}