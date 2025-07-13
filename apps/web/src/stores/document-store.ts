import { create } from 'zustand';
import { Document, FilterCriteria } from '@mmt/entities';

interface DocumentStoreState {
  // State
  documents: Document[];
  filteredDocuments: Document[];
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
      set({ documents: data.documents, filteredDocuments: data.documents, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },
  
  clearError: () => set({ error: null })
}));