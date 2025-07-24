import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DocumentTable } from '../../src/components/DocumentTable';
import { useDocumentStore } from '../../src/stores/document-store';

describe('DocumentTable', () => {
  const realDocuments = [
    {
      path: '/vault/doc1.md',
      metadata: {
        name: 'Document 1',
        modified: '2024-01-10T12:00:00.000Z',
        size: 1024,
        tags: ['tag1', 'tag2'],
        frontmatter: {}
      }
    },
    {
      path: '/vault/doc2.md',
      metadata: {
        name: 'Document 2',
        modified: '2024-01-11T15:30:00.000Z',
        size: 2048,
        tags: [],
        frontmatter: {}
      }
    }
  ];

  beforeEach(() => {
    // Reset store to clean state with no-op fetchDocuments
    useDocumentStore.setState({ 
      documents: realDocuments,
      loading: false,
      error: null,
      fetchDocuments: async () => {
        // No-op during tests - data is set manually
      }
    });
  });

  it('should display formatted dates correctly', async () => {
    await act(async () => {
      render(<DocumentTable />);
    });
    
    // Dates should be formatted as relative time
    await waitFor(() => {
      const dateElements = screen.getAllByText(/2024/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  it('should display file sizes in human readable format', async () => {
    await act(async () => {
      render(<DocumentTable />);
    });
    
    // File sizes should be formatted (1024 -> 1KB, 2048 -> 2KB)
    await waitFor(() => {
      expect(screen.getByText('1KB')).toBeInTheDocument();
      expect(screen.getByText('2KB')).toBeInTheDocument();
    });
  });

  it('should display tags properly', async () => {
    await act(async () => {
      render(<DocumentTable />);
    });
    
    // First document has tags
    await waitFor(() => {
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
    });
  });
});