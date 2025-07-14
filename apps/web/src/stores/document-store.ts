import { create } from 'zustand';
import { Document, FilterCriteria } from '@mmt/entities';

/**
 * Document Store - Manages document fetching with server-side filtering
 * 
 * The store supports natural language filtering via the API:
 * 
 * Natural Language Date Expressions:
 * - "last 30 days", "past 7 days" - Documents modified in the last N days
 * - "yesterday", "today" - Documents modified on specific days
 * - "this week", "this month", "this year" - Current period documents
 * - "since 2024", "since January" - Documents since a specific time
 * - "before 2025", "until December" - Documents before a specific time
 * - "-30d" - Shorthand for last 30 days
 * 
 * Natural Language Size Expressions:
 * - "over 1mb", "greater than 100k" - Files larger than specified size
 * - "under 10k", "less than 5mb" - Files smaller than specified size
 * - "at least 1gb", "at most 500k" - Inclusive size boundaries
 * - Size units: b/bytes, k/kb, m/mb, g/gb
 * 
 * Example Usage:
 * setFilters({
 *   dateExpression: 'last 30 days',
 *   sizeExpression: 'under 100k',
 *   tags: ['important']
 * });
 * fetchDocuments();
 */
interface DocumentStoreState {
  // State
  documents: Document[];
  filteredDocuments: Document[];
  totalCount: number; // Total number of documents matching the current filters
  vaultTotal: number; // Total number of documents in the vault (unfiltered)
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filters: FilterCriteria;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setFilters: (filters: FilterCriteria) => void;
  fetchDocuments: () => Promise<void>;
  clearError: () => void;
}

// No longer needed - filtering happens on the server

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  // State
  documents: [],
  filteredDocuments: [],
  totalCount: 0,
  vaultTotal: 0,
  loading: false,
  error: null,
  searchQuery: '',
  filters: {},
  
  // Actions
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  
  setFilters: (filters: FilterCriteria) => {
    set({ filters });
    // Trigger a new fetch with the updated filters
    get().fetchDocuments();
  },
  
  fetchDocuments: async () => {
    set({ loading: true, error: null });
    
    try {
      const query = get().searchQuery;
      const filters = get().filters;
      // Limit to 500 for performance
      const limit = 500;
      
      // Build URL with query parameters
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      params.append('limit', limit.toString());
      params.append('offset', '0');
      
      // Add filters as JSON if present
      if (filters && Object.keys(filters).length > 0) {
        params.append('filters', JSON.stringify(filters));
      }
      
      const url = `/api/documents?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // Server already filtered the documents
      set({ 
        documents: data.documents, 
        filteredDocuments: data.documents, 
        totalCount: data.total,
        vaultTotal: data.vaultTotal,
        loading: false 
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },
  
  clearError: () => set({ error: null })
}));