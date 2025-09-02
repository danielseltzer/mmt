import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { QueryBar } from '../../src/components/QueryBar'
import { DocumentTable } from '../../src/components/DocumentTable'
import { useDocumentStore } from '../../src/stores/document-store'

describe('shadcn/ui Integration', () => {
  let tempDir;
  let originalStore;
  
  // Helper to create test documents in temp directory
  function createTestDocuments() {
    const docs = [];
    for (let i = 0; i < 3; i++) {
      const path = join(tempDir, `test-doc-${i}.md`);
      const content = `# Test Document ${i}\n\nContent for test document ${i}`;
      writeFileSync(path, content);
      
      docs.push({
        path,
        content,
        metadata: {
          name: `test-doc-${i}`,
          modified: new Date(2024, 0, i + 1),
          size: new TextEncoder().encode(content).length,
          frontmatter: {},
          tags: [`tag-${i}`],
          links: []
        }
      });
    }
    return docs;
  }
  
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mmt-ui-test-'));
    // Save original store state
    originalStore = useDocumentStore.getState();
    // Prevent API calls during tests by overriding fetchDocuments
    useDocumentStore.setState({ 
      fetchDocuments: async () => {
        // No-op during tests - data is set manually
      }
    });
  });

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    // Reset store to original state
    useDocumentStore.setState(originalStore);
  });

  // App component test removed - it makes API calls on mount
  // This test is now in integration tests

  it('renders QueryBar with shadcn/ui Input and search icon', async () => {
    // GIVEN: Empty store state
    useDocumentStore.setState({ documents: [], loading: false, error: null });
    
    // WHEN: Rendering the QueryBar component
    await act(async () => {
      render(<QueryBar />);
    });
    
    // THEN: Should render with shadcn/ui Input styling
    // Check that the search input is rendered
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search documents...');
      expect(searchInput).toBeInTheDocument();
      
      // Check that input has the correct Tailwind classes
      expect(searchInput).toHaveClass('pl-10'); // padding for search icon
    });
  });

  it('renders DocumentTable with shadcn/ui components', async () => {
    // GIVEN: Store with real documents
    const documents = createTestDocuments();
    useDocumentStore.setState({ documents, loading: false, error: null });
    
    // WHEN: Rendering the DocumentTable
    await act(async () => {
      render(<DocumentTable />);
    });
    
    // THEN: Should render the table with Card wrapper
    // Verify document count is shown
    await waitFor(() => {
      expect(screen.getByText(`${documents.length} documents`)).toBeInTheDocument();
    });
  });

  it('renders loading state with Lucide React icons', async () => {
    // GIVEN: Store in loading state
    useDocumentStore.setState({ documents: [], loading: true, error: null });
    
    // WHEN: Rendering the DocumentTable
    await act(async () => {
      render(<DocumentTable />);
    });
    
    // THEN: Should show loading spinner and text
    await waitFor(() => {
      expect(screen.getByText('Loading documents...')).toBeInTheDocument();
      
      // Check for spinner element (Lucide Loader2 with animate-spin class)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  it('renders error state with shadcn/ui Alert', async () => {
    // GIVEN: Store with an error
    useDocumentStore.setState({ documents: [], loading: false, error: 'Test error message' });
    
    // WHEN: Rendering the DocumentTable
    await act(async () => {
      render(<DocumentTable />);
    });
    
    // THEN: Should display error in Alert component
    await waitFor(() => {
      expect(screen.getByText('Error: Test error message')).toBeInTheDocument();
      
      // Check for Alert component with destructive variant
      const alertElement = screen.getByText('Error: Test error message').closest('[class*="destructive"]');
      expect(alertElement).toBeInTheDocument();
    });
  });
  
  // Integration test removed - App component makes API calls on mount
  // This test is now in integration tests
});