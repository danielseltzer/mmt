import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentTable } from '../components/DocumentTable';
import { useDocumentStore } from '../stores/document-store';

describe('Document Table Sorting', () => {
  const testDocuments = [
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

  beforeEach(() => {
    // Reset the store to initial state and set test data
    const store = useDocumentStore.getState();

    // Reset store state
    store.setDocuments(testDocuments);
    store.setLoading(false);
    store.setError(null);
    store.setSort(undefined, 'asc');
  });

  it('should update sort state when Name column header is clicked', () => {
    render(<DocumentTable />);

    const nameHeader = screen.getByTestId('column-header-name');
    fireEvent.click(nameHeader);

    // Check that the store state was updated
    const store = useDocumentStore.getState();
    expect(store.sortBy).toBe('name');
    expect(store.sortOrder).toBe('asc');
  });

  it('should toggle sort order when same column is clicked twice', () => {
    const { rerender } = render(<DocumentTable />);
    
    const nameHeader = screen.getByTestId('column-header-name');
    
    // First click - ascending
    fireEvent.click(nameHeader);
    let store = useDocumentStore.getState();
    expect(store.sortBy).toBe('name');
    expect(store.sortOrder).toBe('asc');

    // Second click - should toggle to descending
    fireEvent.click(nameHeader);
    store = useDocumentStore.getState();
    expect(store.sortBy).toBe('name');
    expect(store.sortOrder).toBe('desc');
  });

  it('should sort by Path column when clicked', () => {
    render(<DocumentTable />);

    const pathHeader = screen.getByTestId('column-header-path');
    fireEvent.click(pathHeader);

    const store = useDocumentStore.getState();
    expect(store.sortBy).toBe('path');
    expect(store.sortOrder).toBe('asc');
  });

  it('should sort by Modified column when clicked', () => {
    render(<DocumentTable />);

    const modifiedHeader = screen.getByTestId('column-header-modified');
    fireEvent.click(modifiedHeader);

    const store = useDocumentStore.getState();
    expect(store.sortBy).toBe('modified');
    expect(store.sortOrder).toBe('asc');
  });

  it('should sort by Size column when clicked', () => {
    render(<DocumentTable />);

    const sizeHeader = screen.getByTestId('column-header-size');
    fireEvent.click(sizeHeader);

    const store = useDocumentStore.getState();
    expect(store.sortBy).toBe('size');
    expect(store.sortOrder).toBe('asc');
  });

  it('should show sort indicator on sorted column', () => {
    // Set up the store with a sorted state
    const store = useDocumentStore.getState();
    store.setSort('name', 'desc');

    render(<DocumentTable />);

    const nameHeader = screen.getByTestId('column-header-name');
    // Check for desc sort indicator (usually ↓ or similar)
    expect(nameHeader.textContent).toContain('↓');
  });
});