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

    // Create a test tab with test documents
    store.tabs = [{
      tabId: 'test-tab',
      vaultId: 'test-vault',
      tabName: 'Test Tab',
      documents: testDocuments,
      filteredDocuments: testDocuments,
      totalCount: testDocuments.length,
      vaultTotal: testDocuments.length,
      searchQuery: '',
      filters: { conditions: [], logic: 'AND' },
      sortBy: undefined,
      sortOrder: 'asc',
      searchMode: 'text',
      similarityResults: [],
      loading: false,
      loadingSimilarity: false,
      error: null
    }];
    store.activeTabId = 'test-tab';
  });

  it('should update sort state when Name column header is clicked', () => {
    render(<DocumentTable />);

    const nameHeader = screen.getByTestId('column-header-name');
    fireEvent.click(nameHeader);

    // Check that the store state was updated
    const currentTab = useDocumentStore.getState().getCurrentTab();
    expect(currentTab?.sortBy).toBe('name');
    expect(currentTab?.sortOrder).toBe('asc');
  });

  it('should toggle sort order when same column is clicked twice', () => {
    render(<DocumentTable />);
    
    const nameHeader = screen.getByTestId('column-header-name');
    
    // First click - ascending
    fireEvent.click(nameHeader);
    let currentTab = useDocumentStore.getState().getCurrentTab();
    expect(currentTab?.sortBy).toBe('name');
    expect(currentTab?.sortOrder).toBe('asc');

    // Second click - should toggle to descending
    fireEvent.click(nameHeader);
    currentTab = useDocumentStore.getState().getCurrentTab();
    expect(currentTab?.sortBy).toBe('name');
    expect(currentTab?.sortOrder).toBe('desc');
  });

  it('should sort by Path column when clicked', () => {
    render(<DocumentTable />);

    const pathHeader = screen.getByTestId('column-header-path');
    fireEvent.click(pathHeader);

    const currentTab = useDocumentStore.getState().getCurrentTab();
    expect(currentTab?.sortBy).toBe('path');
    expect(currentTab?.sortOrder).toBe('asc');
  });

  it('should sort by Modified column when clicked', () => {
    render(<DocumentTable />);

    const modifiedHeader = screen.getByTestId('column-header-modified');
    fireEvent.click(modifiedHeader);

    const currentTab = useDocumentStore.getState().getCurrentTab();
    expect(currentTab?.sortBy).toBe('modified');
    expect(currentTab?.sortOrder).toBe('asc');
  });

  it('should sort by Size column when clicked', () => {
    render(<DocumentTable />);

    const sizeHeader = screen.getByTestId('column-header-size');
    fireEvent.click(sizeHeader);

    const currentTab = useDocumentStore.getState().getCurrentTab();
    expect(currentTab?.sortBy).toBe('size');
    expect(currentTab?.sortOrder).toBe('asc');
  });

  it('should show sort indicator on sorted column', () => {
    // Set up the store with a sorted state
    const store = useDocumentStore.getState();
    // Update the current tab's sort state
    if (store.tabs[0]) {
      store.tabs[0].sortBy = 'name';
      store.tabs[0].sortOrder = 'desc';
    }

    render(<DocumentTable />);

    const nameHeader = screen.getByTestId('column-header-name');
    // Check for desc sort indicator (usually ↓ or similar)
    expect(nameHeader.textContent).toContain('↓');
  });
});