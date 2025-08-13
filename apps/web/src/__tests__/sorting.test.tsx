import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentTable } from '../components/DocumentTable';
import { useDocumentStore } from '../stores/document-store';

// Mock the document store
vi.mock('../stores/document-store');

describe('Document Table Sorting', () => {
  const mockDocuments = [
    {
      path: '/',
      metadata: {
        name: 'zebra.md',
        modified: '2025-01-15T00:00:00Z',
        size: 1000,
        frontmatter: {},
        tags: [],
        links: []
      }
    },
    {
      path: '/',
      metadata: {
        name: 'apple.md',
        modified: '2025-01-10T00:00:00Z',
        size: 2000,
        frontmatter: {},
        tags: [],
        links: []
      }
    },
    {
      path: '/folder',
      metadata: {
        name: 'banana.md',
        modified: '2025-01-20T00:00:00Z',
        size: 500,
        frontmatter: {},
        tags: [],
        links: []
      }
    }
  ];

  const mockSetSort = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useDocumentStore as any).mockReturnValue({
      filteredDocuments: mockDocuments,
      loading: false,
      error: null,
      sortBy: undefined,
      sortOrder: 'asc',
      setSort: mockSetSort
    });
  });

  it('should call setSort when Name column header is clicked', () => {
    render(<DocumentTable />);
    
    const nameHeader = screen.getByTestId('column-header-name');
    fireEvent.click(nameHeader);
    
    // First click should sort ascending
    expect(mockSetSort).toHaveBeenCalledWith('name', 'asc');
  });

  it('should toggle sort order when same column is clicked twice', () => {
    const { rerender } = render(<DocumentTable />);
    
    const nameHeader = screen.getByTestId('column-header-name');
    
    // First click - ascending
    fireEvent.click(nameHeader);
    expect(mockSetSort).toHaveBeenCalledWith('name', 'asc');
    
    // Update the mock to reflect the sort state
    (useDocumentStore as any).mockReturnValue({
      filteredDocuments: mockDocuments,
      loading: false,
      error: null,
      sortBy: 'name',
      sortOrder: 'asc',
      setSort: mockSetSort
    });
    rerender(<DocumentTable />);
    
    // Second click - should toggle to descending
    fireEvent.click(nameHeader);
    expect(mockSetSort).toHaveBeenCalledWith('name', 'desc');
  });

  it('should sort by Path column when clicked', () => {
    render(<DocumentTable />);
    
    const pathHeader = screen.getByTestId('column-header-path');
    fireEvent.click(pathHeader);
    
    expect(mockSetSort).toHaveBeenCalledWith('path', 'asc');
  });

  it('should sort by Modified column when clicked', () => {
    render(<DocumentTable />);
    
    const modifiedHeader = screen.getByTestId('column-header-modified');
    fireEvent.click(modifiedHeader);
    
    expect(mockSetSort).toHaveBeenCalledWith('modified', 'asc');
  });

  it('should sort by Size column when clicked', () => {
    render(<DocumentTable />);
    
    const sizeHeader = screen.getByTestId('column-header-size');
    fireEvent.click(sizeHeader);
    
    expect(mockSetSort).toHaveBeenCalledWith('size', 'asc');
  });

  it('should show sort indicator on sorted column', () => {
    (useDocumentStore as any).mockReturnValue({
      filteredDocuments: mockDocuments,
      loading: false,
      error: null,
      sortBy: 'name',
      sortOrder: 'desc',
      setSort: mockSetSort
    });
    
    render(<DocumentTable />);
    
    const nameHeader = screen.getByTestId('column-header-name');
    // Check for desc sort indicator (usually ↓ or similar)
    expect(nameHeader.textContent).toContain('↓');
  });
});