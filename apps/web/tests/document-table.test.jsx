import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DocumentTable } from '../src/components/DocumentTable';
import { useDocumentStore } from '../src/stores/document-store';

// Mock the store
vi.mock('../src/stores/document-store');

describe('DocumentTable', () => {
  const mockDocuments = [
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
    useDocumentStore.mockReturnValue({
      documents: mockDocuments,
      loading: false,
      error: null
    });
  });

  it('should display formatted dates correctly', async () => {
    render(<DocumentTable />);
    
    // Wait for the table to render
    await waitFor(() => {
      const dates = screen.getAllByText(/2024/);
      expect(dates).toHaveLength(2);
    });

    // Check that dates are properly formatted
    expect(screen.getByText(/Jan 10, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 11, 2024/)).toBeInTheDocument();
  });

  it('should not display "Invalid Date" for valid dates', async () => {
    render(<DocumentTable />);
    
    await waitFor(() => {
      expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
    });
  });

  it('should display correct number of rows without empty rows', async () => {
    render(<DocumentTable />);
    
    await waitFor(() => {
      // Get all table rows except header
      const rows = screen.getAllByRole('row');
      // Should have 1 header row + 2 data rows = 3 total
      expect(rows).toHaveLength(3);
      
      // Verify no empty rows
      rows.forEach((row, index) => {
        if (index > 0) { // Skip header row
          expect(row.textContent).not.toBe('');
          expect(row.textContent).toContain('Document');
        }
      });
    });
  });

  it('should format file sizes correctly', async () => {
    render(<DocumentTable />);
    
    await waitFor(() => {
      expect(screen.getByText('1.0 KB')).toBeInTheDocument();
      expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    });
  });

  it('should handle invalid date gracefully', async () => {
    const docsWithInvalidDate = [{
      path: '/vault/doc3.md',
      metadata: {
        name: 'Document 3',
        modified: 'invalid-date',
        size: 512,
        tags: [],
        frontmatter: {}
      }
    }];

    useDocumentStore.mockReturnValue({
      documents: docsWithInvalidDate,
      loading: false,
      error: null
    });

    render(<DocumentTable />);
    
    await waitFor(() => {
      // Should show a fallback for invalid date
      expect(screen.getByText('Invalid Date')).toBeInTheDocument();
    });
  });

  it('should not render empty tbody elements', async () => {
    const { container } = render(<DocumentTable />);
    
    await waitFor(() => {
      const tbodies = container.querySelectorAll('tbody');
      // Should only have one tbody
      expect(tbodies).toHaveLength(1);
      
      // Check that tbody has content
      const tbody = tbodies[0];
      expect(tbody.children.length).toBeGreaterThan(0);
    });
  });
});