import type { Document, FilterCondition } from '@mmt/entities';
import type { Logger } from '@mmt/logger';

/**
 * Handles evaluation of filter conditions against documents
 * Extracted from PipelineExecutor to improve maintainability
 */
export class FilterExecutor {
  constructor(private logger: Logger) {}

  /**
   * Evaluate a single filter condition against a document
   */
  evaluateFilter(doc: Document, filter: FilterCondition): boolean {
    switch (filter.field) {
      case 'name':
      case 'content':
      case 'search': {
        const textFilter = filter as any; // TypeScript discriminated union limitation
        const searchIn = this.getSearchableText(doc, textFilter.field);
        return this.evaluateTextOperator(searchIn, textFilter.operator, textFilter.value, textFilter.caseSensitive);
      }
      
      case 'folders': {
        const folderFilter = filter as any;
        const docFolder = doc.path.substring(0, doc.path.lastIndexOf('/'));
        if (folderFilter.operator === 'in') {
          return folderFilter.value.some((folder: string) => docFolder.startsWith(folder));
        } else {
          // not_in
          return !folderFilter.value.some((folder: string) => docFolder.startsWith(folder));
        }
      }
      
      case 'tags': {
        const tagFilter = filter as any;
        const docTags = doc.metadata.tags || [];
        return this.evaluateArrayOperator(docTags, tagFilter.operator, tagFilter.value);
      }
      
      case 'metadata': {
        const metaFilter = filter as any;
        const metaValue = doc.metadata.frontmatter?.[metaFilter.key];
        // MVP: only equals operator for metadata
        return metaValue === metaFilter.value;
      }
      
      case 'modified':
      case 'created': {
        const dateFilter = filter as any;
        // Note: created date is not available in the current document schema
        // For now, treat created filters as always false
        if (dateFilter.field === 'created') {
          this.logger.warn('Created date filtering is not supported - document metadata does not include creation date');
          return false;
        }
        const docDate = doc.metadata.modified;
        if (!docDate) return false;
        return this.evaluateDateOperator(docDate.toISOString(), dateFilter.operator, dateFilter.value.toISOString());
      }
      
      case 'size': {
        const sizeFilter = filter as any;
        return this.evaluateNumberOperator(doc.metadata.size, sizeFilter.operator, sizeFilter.value);
      }
      
      default:
        return false;
    }
  }

  private getSearchableText(doc: Document, field: 'name' | 'content' | 'search'): string {
    switch (field) {
      case 'name':
        return doc.metadata.name;
      case 'content':
        return doc.content || '';
      case 'search':
        // Search in both name and content
        return `${doc.metadata.name} ${doc.content || ''}`;
      default:
        return '';
    }
  }

  private evaluateTextOperator(text: string, operator: string, value: string, caseSensitive?: boolean): boolean {
    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchValue = caseSensitive ? value : value.toLowerCase();
    
    switch (operator) {
      case 'contains':
        return searchText.includes(searchValue);
      case 'not_contains':
        return !searchText.includes(searchValue);
      case 'equals':
        return searchText === searchValue;
      case 'not_equals':
        return searchText !== searchValue;
      case 'starts_with':
        return searchText.startsWith(searchValue);
      case 'ends_with':
        return searchText.endsWith(searchValue);
      case 'regex':
        try {
          const flags = caseSensitive ? 'g' : 'gi';
          const regex = new RegExp(searchValue, flags);
          return regex.test(searchText);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private evaluateArrayOperator(array: string[], operator: string, value: string[]): boolean {
    switch (operator) {
      case 'contains_any':
        return value.some(v => array.includes(v));
      case 'contains_all':
        return value.every(v => array.includes(v));
      case 'not_contains':
        return !value.some(v => array.includes(v));
      default:
        return false;
    }
  }

  private evaluateDateOperator(docDate: Date | string, operator: string, value: Date | string): boolean {
    const docTime = new Date(docDate).getTime();
    const filterTime = new Date(value).getTime();
    
    switch (operator) {
      case 'equals':
        // For date equality, compare just the date part (ignore time)
        const docDateOnly = new Date(docDate).toDateString();
        const filterDateOnly = new Date(value).toDateString();
        return docDateOnly === filterDateOnly;
      case 'not_equals':
        return docTime !== filterTime;
      case 'before':
        return docTime < filterTime;
      case 'after':
        return docTime > filterTime;
      case 'on_or_before':
        return docTime <= filterTime;
      case 'on_or_after':
        return docTime >= filterTime;
      default:
        return false;
    }
  }

  private evaluateNumberOperator(docValue: number, operator: string, value: number): boolean {
    switch (operator) {
      case 'equals':
        return docValue === value;
      case 'not_equals':
        return docValue !== value;
      case 'greater_than':
        return docValue > value;
      case 'less_than':
        return docValue < value;
      case 'greater_than_or_equal':
        return docValue >= value;
      case 'less_than_or_equal':
        return docValue <= value;
      default:
        return false;
    }
  }
}
