import { create } from 'zustand';
import type { Document } from '@mmt/entities';

interface DocumentStore {
  // State
  documents: Document[];
  selectedDocuments: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setDocuments: (documents: Document[]) => void;
  toggleDocument: (path: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  executeQuery: (query: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  // Initial state
  documents: [],
  selectedDocuments: [],
  isLoading: false,
  error: null,

  // Actions
  setDocuments: (documents) => set({ documents }),
  
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

  clearSelection: () => set({ selectedDocuments: [] }),

  executeQuery: async (query) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Call tRPC to execute query
      // For now, mock some data
      const mockDocuments: Document[] = [
        {
          path: '/vault/notes/example.md',
          content: '',
          metadata: {
            name: 'example',
            modified: new Date(),
            size: 1024,
            frontmatter: {},
            tags: ['example', 'demo'],
            links: [],
          },
        },
      ];
      set({ documents: mockDocuments, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false,
      });
    }
  },

  setError: (error) => set({ error }),
}));