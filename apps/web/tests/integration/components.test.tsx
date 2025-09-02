import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { QueryBar } from '../../src/components/QueryBar'
import { DocumentTable } from '../../src/components/DocumentTable'
import { useDocumentStore } from '../../src/stores/document-store'

describe.skip('Component Tests (No API) - SKIPPED: These should be true integration tests', () => {
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

  it('renders QueryBar with shadcn/ui Input and search icon', () => {
    // GIVEN: Empty store state
    useDocumentStore.setState({ documents: [], loading: false, error: null });
    
    // WHEN: Rendering the QueryBar component
    render(<QueryBar />);
    
    // THEN: Should render with shadcn/ui Input styling
    // Check that the search input is rendered
    const searchInput = screen.getByPlaceholderText('Search documents...');
    expect(searchInput).toBeInTheDocument();
    
    // Check that input has the correct Tailwind classes
    expect(searchInput).toHaveClass('pl-10'); // padding for search icon
  });

  it('renders DocumentTable with shadcn/ui components', () => {
    // GIVEN: Store with real documents
    const documents = createTestDocuments();
    useDocumentStore.setState({ documents, loading: false, error: null });
    
    // WHEN: Rendering the DocumentTable
    render(<DocumentTable />);
    
    // THEN: Should render the table with Card wrapper
    // Card components have rounded corners and shadow styling
    const tableContainer = document.querySelector('.rounded-xl.border.bg-card');
    expect(tableContainer).toBeInTheDocument();
    
    // Verify document count is shown
    expect(screen.getByText(`${documents.length} documents`)).toBeInTheDocument();
  });

  it('renders loading state with Lucide React icons', () => {
    // GIVEN: Store in loading state
    useDocumentStore.setState({ documents: [], loading: true, error: null });
    
    // WHEN: Rendering the DocumentTable
    render(<DocumentTable />);
    
    // THEN: Should show loading spinner and text
    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
    
    // Check for spinner element (Lucide Loader2 with animate-spin class)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders error state with shadcn/ui Alert', () => {
    // GIVEN: Store with an error
    useDocumentStore.setState({ documents: [], loading: false, error: 'Test error message' });
    
    // WHEN: Rendering the DocumentTable
    render(<DocumentTable />);
    
    // THEN: Should display error in Alert component
    expect(screen.getByText('Error: Test error message')).toBeInTheDocument();
    
    // Check for Alert component with destructive variant
    const alertElement = screen.getByText('Error: Test error message').closest('[class*="destructive"]');
    expect(alertElement).toBeInTheDocument();
  });
});