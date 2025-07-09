import { create } from 'zustand';
import { Document } from '@mmt/entities';

interface DocumentStoreState {
  // State
  documents: Document[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  
  // Actions
  setSearchQuery: (query: string) => void;
  fetchDocuments: () => Promise<void>;
  clearError: () => void;
}

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  // State
  documents: [],
  loading: false,
  error: null,
  searchQuery: '',
  
  // Actions
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  
  fetchDocuments: async () => {
    set({ loading: true, error: null });
    
    try {
      const query = get().searchQuery;
      const url = query 
        ? `/api/documents?q=${encodeURIComponent(query)}`
        : '/api/documents';
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      set({ documents: data.documents, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },
  
  clearError: () => set({ error: null })
}));