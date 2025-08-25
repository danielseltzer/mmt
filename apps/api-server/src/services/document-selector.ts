import type { Document, SelectCriteria, FilterCollection } from '@mmt/entities';
import type { Logger } from '@mmt/logger';
import { FilterExecutor } from './filter-executor.js';

/**
 * Handles document selection based on criteria
 * Extracted from PipelineExecutor to improve maintainability
 */
export class DocumentSelector {
  private filterExecutor: FilterExecutor;

  constructor(private logger: Logger) {
    this.filterExecutor = new FilterExecutor(logger);
  }

  /**
   * Select documents based on criteria
   */
  async selectDocuments(allDocuments: Document[], criteria: SelectCriteria): Promise<Document[]> {
    let selectedDocuments = [...allDocuments];

    // Apply filters if specified
    if (criteria.filters) {
      selectedDocuments = this.applyFilters(selectedDocuments, criteria.filters);
    }

    // Apply limit if specified
    if (criteria.limit && criteria.limit > 0) {
      selectedDocuments = selectedDocuments.slice(0, criteria.limit);
    }

    this.logger.debug(`Selected ${selectedDocuments.length} documents from ${allDocuments.length} total`);
    return selectedDocuments;
  }

  /**
   * Apply filter collection to documents
   */
  private applyFilters(documents: Document[], filters: FilterCollection): Document[] {
    return documents.filter(doc => this.evaluateFilterCollection(doc, filters));
  }

  /**
   * Evaluate a filter collection against a document
   */
  private evaluateFilterCollection(doc: Document, collection: FilterCollection): boolean {
    if (!collection.conditions || collection.conditions.length === 0) {
      return true;
    }

    const results = collection.conditions.map(condition => {
      if ('field' in condition) {
        // It's a FilterCondition
        return this.filterExecutor.evaluateFilter(doc, condition);
      } else {
        // It's a nested FilterCollection
        return this.evaluateFilterCollection(doc, condition);
      }
    });

    // Apply logical operator
    switch (collection.operator) {
      case 'AND':
        return results.every(result => result);
      case 'OR':
        return results.some(result => result);
      case 'NOT':
        // For NOT, we expect exactly one condition and negate it
        return results.length === 1 ? !results[0] : false;
      default:
        return false;
    }
  }

  /**
   * Get a preview of what documents would be selected
   */
  async getSelectionPreview(allDocuments: Document[], criteria: SelectCriteria): Promise<{
    totalDocuments: number;
    selectedCount: number;
    sampleDocuments: Document[];
  }> {
    const selected = await this.selectDocuments(allDocuments, criteria);
    
    return {
      totalDocuments: allDocuments.length,
      selectedCount: selected.length,
      sampleDocuments: selected.slice(0, 5) // Show first 5 as sample
    };
  }
}
