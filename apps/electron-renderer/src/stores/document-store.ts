import { create } from 'zustand';
import type { Document, DocumentSet } from '@mmt/entities';
import { api } from '../api/client.js';
import { useUIStore } from './ui-store.js';

interface DocumentStore {
  // State
  documents: Document[];
  docSet: DocumentSet | null;
  currentQuery: string;
  selectedDocuments: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setDocuments: (documents: Document[]) => void;
  setDocSet: (docSet: DocumentSet | null) => void;
  toggleDocument: (path: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  executeQuery: (query: string) => Promise<void>;
  refresh: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  // Initial state
  documents: [],
  docSet: null,
  currentQuery: '',
  selectedDocuments: [],
  isLoading: false,
  error: null,

  // Actions
  setDocuments: (documents) => {
    set({ documents });
  },
  
  setDocSet: (docSet) => {
    set({ docSet });
  },
  
  toggleDocument: (path) => {
    const { selectedDocuments } = get();
    if (selectedDocuments.includes(path)) {
      set({ selectedDocuments: selectedDocuments.filter((p) => p !== path) });
    } else {
      set({ selectedDocuments: [...selectedDocuments, path] });
    }
  },

  selectAll: () => {
    const { documents } = get();
    set({ selectedDocuments: documents.map((d) => d.path) });
  },

  clearSelection: () => {
    set({ selectedDocuments: [] });
  },

  executeQuery: async (query) => {
    set({ isLoading: true, error: null, currentQuery: query });
    
    try {
      // Execute query via tRPC
      const result = await api.indexer.query.query({ query });
      
      // Transform results to Document format
      const documents: Document[] = result.documents.map((doc: any) => ({
        path: doc.path,
        content: '', // Content loaded on demand
        metadata: {
          name: doc.metadata.name,
          modified: new Date(doc.metadata.modified),
          size: doc.metadata.size,
          frontmatter: doc.metadata.frontmatter,
          tags: doc.metadata.tags,
          links: doc.metadata.links,
        },
      }));
      
      // Create DocumentSet from results
      const docSet: DocumentSet = {
        id: `query-${Date.now()}`,
        documents: documents,
        source: query || undefined,
      };
      
      set({ 
        documents, 
        docSet,
        isLoading: false,
        error: null,
      });
      
      // Show success notification
      useUIStore.getState().showNotification({
        type: 'success',
        title: 'Query executed',
        message: `Found ${documents.length} documents`,
        duration: 3000,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute query';
      set({ 
        error: errorMessage,
        isLoading: false,
      });
      
      // Show error notification
      useUIStore.getState().showNotification({
        type: 'error',
        title: 'Query failed',
        message: errorMessage,
        duration: 5000,
      });
    }
  },
  
  refresh: async () => {
    const { currentQuery } = get();
    await get().executeQuery(currentQuery);
  },

  setError: (error) => {
    set({ error });
  },
}));