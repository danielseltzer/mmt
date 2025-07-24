import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { QueryBar } from '../../src/components/QueryBar.jsx'
import { DocumentTable } from '../../src/components/DocumentTable.jsx'
import { useDocumentStore } from '../../src/stores/document-store'

describe('Full Stack Integration Tests', () => {
  let testVaultDir;
  
  beforeEach(async () => {
    // Use the shared vault that the API server is configured with
    testVaultDir = import.meta.env.MMT_SHARED_VAULT;
    
    // Create some test documents in the vault
    const docs = [
      { name: 'doc1.md', content: '# Document 1\n\nThis is the first test document.' },
      { name: 'doc2.md', content: '# Document 2\n\nThis document has [[links]] to other docs.' },
      { name: 'doc3.md', content: '# Document 3\n\nTagged with #test #integration' }
    ];
    
    for (const doc of docs) {
      writeFileSync(join(testVaultDir, doc.name), doc.content);
    }
    
    // Reset the document store
    useDocumentStore.getState().reset();
  });
  
  afterEach(() => {
    // Cleanup is handled by setup-integration.ts
  });
  
  it('fetches and displays documents from the API', async () => {
    // GIVEN: A vault with test documents
    // (created in beforeEach)
    
    // WHEN: Rendering the DocumentTable
    render(<DocumentTable />);
    
    // THEN: Should fetch documents from the API and display them
    await waitFor(() => {
      expect(screen.getByText('3 documents')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Verify document names are shown
    expect(screen.getByText('doc1.md')).toBeInTheDocument();
    expect(screen.getByText('doc2.md')).toBeInTheDocument();
    expect(screen.getByText('doc3.md')).toBeInTheDocument();
  });
  
  it('handles empty vault correctly', async () => {
    // GIVEN: Clear the vault
    const files = ['doc1.md', 'doc2.md', 'doc3.md'];
    for (const file of files) {
      const path = join(testVaultDir, file);
      if (existsSync(path)) {
        rmSync(path);
      }
    }
    
    // Reset store to trigger fresh fetch
    useDocumentStore.getState().reset();
    
    // WHEN: Rendering the DocumentTable
    render(<DocumentTable />);
    
    // THEN: Should show empty state
    await waitFor(() => {
      expect(screen.getByText('0 documents')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
  
  it('updates when new documents are added', async () => {
    // GIVEN: Initial render with 3 documents
    render(<DocumentTable />);
    
    await waitFor(() => {
      expect(screen.getByText('3 documents')).toBeInTheDocument();
    });
    
    // WHEN: Adding a new document and refreshing
    writeFileSync(join(testVaultDir, 'doc4.md'), '# Document 4\n\nNewly added document');
    
    // Wait for file watching to pick up the change
    await new Promise(resolve => setTimeout(resolve, 200));
    await useDocumentStore.getState().fetchDocuments();
    
    // THEN: Should show 4 documents
    await waitFor(() => {
      expect(screen.getByText('4 documents')).toBeInTheDocument();
    });
  });
});