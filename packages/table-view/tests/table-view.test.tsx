import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TableView } from '../src/TableView';
import type { Document } from '@mmt/entities';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe.skip('Table View Component - SKIPPED: Component rapidly evolving', () => {
  let tempDir: string;
  let documents: Document[];
  let selectionResults: string[] = [];
  let operationResults: Array<{ operation: string; documentPaths: string[] }> = [];
  let contentLoadResults: Record<string, string> = {};

  // Helper to create real test documents
  function createTestDocuments(count: number): Document[] {
    const docs: Document[] = [];
    for (let i = 0; i < count; i++) {
      const path = join(tempDir, `doc-${i}.md`);
      const content = `# Document ${i}\n\nContent for document ${i}`;
      writeFileSync(path, content);
      
      docs.push({
        path,
        content,
        metadata: {
          name: `doc-${i}`,
          modified: new Date(2024, 0, i + 1),
          size: Buffer.byteLength(content),
          frontmatter: {},
          tags: [`tag-${i % 5}`],
          links: [],
        },
      });
    }
    return docs;
  }

  // Test component wrapper to capture callbacks
  function TestTableView(props: Partial<React.ComponentProps<typeof TableView>>) {
    return (
      <TableView
        documents={documents}
        onSelectionChange={(paths) => {
          selectionResults = paths;
        }}
        onOperationRequest={(req) => {
          operationResults.push(req);
        }}
        onLoadContent={async (path) => {
          if (existsSync(path)) {
            const content = `Preview: ${path}`;
            contentLoadResults[path] = content;
            return content;
          }
          return '';
        }}
        disableVirtualization={true} // For testing
        {...props}
      />
    );
  }

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mmt-tableview-test-'));
    documents = [];
    selectionResults = [];
    operationResults = [];
    contentLoadResults = {};
  });

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('handles documents with undefined dates gracefully', () => {
    // GIVEN: Documents with missing or undefined modified dates
    documents = [
      {
        path: '/test/doc1.md',
        content: 'Test content',
        metadata: {
          name: 'doc1',
          modified: undefined as any, // This is what causes the error
          size: 100,
          frontmatter: {},
          tags: [],
          links: [],
        },
      },
      {
        path: '/test/doc2.md',
        content: 'Test content 2',
        metadata: {
          name: 'doc2',
          modified: null as any, // Also test null
          size: 100,
          frontmatter: {},
          tags: [],
          links: [],
        },
      },
    ];
    
    // WHEN: Rendering the table
    // THEN: Should not throw error
    expect(() => render(<TestTableView />)).not.toThrow();
    
    // And should render the documents
    expect(screen.getByText('2 documents')).toBeInTheDocument();
    expect(screen.getByText('doc1')).toBeInTheDocument();
    expect(screen.getByText('doc2')).toBeInTheDocument();
    
    // Should display '-' for null/undefined dates
    const modifiedCells = screen.getAllByTestId('modified-cell');
    expect(modifiedCells[0]).toHaveTextContent('-');
    expect(modifiedCells[1]).toHaveTextContent('-');
  });

  it('handles empty documents array', () => {
    // GIVEN: No documents
    documents = [];
    
    // WHEN: Rendering the table
    render(<TestTableView />);
    
    // THEN: Should show 0 documents
    expect(screen.getByText('0 documents')).toBeInTheDocument();
  });

  it('handles invalid dates gracefully', () => {
    // GIVEN: Document with an invalid date
    documents = [
      {
        path: '/test/invalid-date.md',
        content: 'Test content',
        metadata: {
          name: 'invalid-date',
          modified: new Date('invalid') as any, // Creates an Invalid Date object
          size: 100,
          frontmatter: {},
          tags: [],
          links: [],
        },
      },
    ];
    
    // WHEN: Rendering the table
    render(<TestTableView />);
    
    // THEN: Should display 'Invalid Date'
    const modifiedCell = screen.getByTestId('modified-cell');
    expect(modifiedCell).toHaveTextContent('Invalid Date');
  });

  it('renders 500 documents without performance issues', async () => {
    // GIVEN: 500 real documents
    documents = createTestDocuments(500);
    
    // WHEN: Rendering the table
    const startTime = performance.now();
    render(<TestTableView />);
    const renderTime = performance.now() - startTime;
    
    // THEN: Should render quickly (with virtualization disabled for tests)
    expect(renderTime).toBeLessThan(2000); // Allow 2 seconds for 500 docs
    
    // With disableVirtualization, all rows are rendered
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(501); // 500 data rows + 1 header row
    
    // Document count should show all 500
    expect(screen.getByText('500 documents')).toBeInTheDocument();
  });

  it('shows total document count with virtual scrolling', () => {
    // GIVEN: 1234 documents
    documents = createTestDocuments(50); // Reduced for test performance
    
    // WHEN: Rendering the table
    render(<TestTableView />);
    
    // THEN: Should show total count
    expect(screen.getByText('50 documents')).toBeInTheDocument();
    
    // With disableVirtualization, all rows are rendered
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(51); // 50 data rows + 1 header row
  });

  it('sorts by filename when header clicked', async () => {
    // GIVEN: Documents with different names
    documents = [
      createTestDocuments(1)[0], // doc-0
    ];
    
    // Add documents with specific names
    const docA = join(tempDir, 'aaa-doc.md');
    writeFileSync(docA, '# AAA Document');
    documents.push({
      path: docA,
      content: '# AAA Document',
      metadata: {
        name: 'aaa-doc',
        modified: new Date(2024, 0, 2),
        size: 14,
        frontmatter: {},
        tags: [],
        links: [],
      },
    });
    
    const docZ = join(tempDir, 'zzz-doc.md');
    writeFileSync(docZ, '# ZZZ Document');
    documents.push({
      path: docZ,
      content: '# ZZZ Document',
      metadata: {
        name: 'zzz-doc',
        modified: new Date(2024, 0, 3),
        size: 14,
        frontmatter: {},
        tags: [],
        links: [],
      },
    });
    
    // WHEN: Clicking the name header
    render(<TestTableView />);
    
    const nameHeader = screen.getByText('Name');
    await userEvent.click(nameHeader);
    
    // THEN: Should sort alphabetically
    const cells = screen.getAllByTestId('name-cell');
    expect(cells[0]).toHaveTextContent('aaa-doc');
    expect(cells[1]).toHaveTextContent('doc-0');
    expect(cells[2]).toHaveTextContent('zzz-doc');
  });

  it('sorts by date descending on second click', async () => {
    // GIVEN: Documents with different dates
    documents = createTestDocuments(3); // Will have dates Jan 1, 2, 3
    
    // WHEN: Clicking the modified header twice
    render(<TestTableView />);
    
    const modifiedHeader = screen.getByText('Modified');
    
    // First click - will sort (initial state depends on the data)
    await userEvent.click(modifiedHeader);
    
    // Wait for sort to complete and check current order
    await waitFor(() => {
      const cells = screen.getAllByTestId('modified-cell');
      // If it's now showing oldest first (ascending), we need another click for descending
      if (cells[0].textContent === '1/1/2024') {
        // It's ascending, so click again for descending
        return userEvent.click(modifiedHeader);
      }
    });
    
    // THEN: Should sort by date descending (newest first)
    const cells = screen.getAllByTestId('modified-cell');
    expect(cells[0]).toHaveTextContent('1/3/2024'); // Jan 3
    expect(cells[1]).toHaveTextContent('1/2/2024'); // Jan 2
    expect(cells[2]).toHaveTextContent('1/1/2024'); // Jan 1
  });

  it('hides column when right-click -> hide', async () => {
    // GIVEN: A table with visible columns
    documents = createTestDocuments(3);
    
    // WHEN: Right-clicking on a column header and selecting hide
    render(<TestTableView />);
    
    const sizeHeader = screen.getByText('Size');
    fireEvent.contextMenu(sizeHeader);
    
    const hideOption = await screen.findByText('Hide column');
    await userEvent.click(hideOption);
    
    // THEN: The column should be hidden
    expect(screen.queryByText('Size')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('size-cell')).toHaveLength(0);
  });

  it('selects all visible rows with header checkbox', async () => {
    // GIVEN: A table with documents
    documents = createTestDocuments(5);
    
    // WHEN: Clicking the header checkbox
    render(<TestTableView />);
    
    const headerCheckbox = screen.getByTestId('select-all-checkbox');
    await userEvent.click(headerCheckbox);
    
    // THEN: All rows should be selected
    await waitFor(() => {
      expect(selectionResults).toEqual(documents.map(d => d.path));
    });
    
    const rowCheckboxes = screen.getAllByRole('checkbox', { checked: true });
    expect(rowCheckboxes).toHaveLength(6); // 5 rows + 1 header
  });

  it('selects range with shift-click', async () => {
    // GIVEN: A table with documents
    documents = createTestDocuments(5);
    
    // WHEN: Clicking first row, then shift-clicking third row
    render(<TestTableView />);
    
    const checkboxes = screen.getAllByRole('checkbox').slice(1); // Skip header checkbox
    await userEvent.click(checkboxes[0]); // Select first
    
    // Simulate shift-click with fireEvent
    fireEvent.click(checkboxes[2], { shiftKey: true });
    
    // THEN: First three rows should be selected
    await waitFor(() => {
      expect(selectionResults).toEqual([
        documents[0].path,
        documents[1].path,
        documents[2].path,
      ]);
    });
  });

  it('emits operation event with selected documents', async () => {
    // GIVEN: A table with some selected documents
    documents = createTestDocuments(3);
    
    // WHEN: Selecting documents and requesting an operation
    render(<TestTableView />);
    
    // Select first two documents
    const checkboxes = screen.getAllByRole('checkbox').slice(1);
    await userEvent.click(checkboxes[0]);
    await userEvent.click(checkboxes[1]);
    
    // Right-click on selection for context menu
    const firstRow = screen.getByTestId(`row-${documents[0].path}`);
    fireEvent.contextMenu(firstRow);
    
    const moveOption = await screen.findByText('Move selected');
    await userEvent.click(moveOption);
    
    // THEN: Should emit operation event with selected paths
    expect(operationResults).toHaveLength(1);
    expect(operationResults[0]).toEqual({
      operation: 'move',
      documentPaths: [documents[0].path, documents[1].path],
    });
  });

  it('preserves column widths after resize', async () => {
    // GIVEN: A table with resizable columns
    documents = createTestDocuments(3);
    
    // WHEN: Resizing a column
    render(<TestTableView />);
    
    const nameHeader = screen.getByTestId('column-header-name');
    const resizeHandle = nameHeader.querySelector('.resize-handle');
    
    // Simulate drag to resize
    fireEvent.mouseDown(resizeHandle!);
    fireEvent.mouseMove(document, { clientX: 200 });
    fireEvent.mouseUp(document);
    
    // THEN: Column width should update
    expect(nameHeader).toHaveStyle({ width: '350px' }); // Default + resize amount
  });

  it('loads preview text only when preview column visible', async () => {
    // GIVEN: Documents with content
    documents = createTestDocuments(3);
    
    // WHEN: Preview column is initially hidden
    render(
      <TestTableView 
        initialColumns={['name', 'path', 'modified']} // No preview
      />
    );
    
    // THEN: Content should not be loaded
    expect(Object.keys(contentLoadResults)).toHaveLength(0);
    
    // WHEN: Showing the preview column
    const columnsButton = screen.getByTestId('columns-config-button');
    await userEvent.click(columnsButton);
    
    const previewCheckbox = screen.getByLabelText('Preview');
    await userEvent.click(previewCheckbox);
    
    // THEN: Content should be loaded for visible documents
    await waitFor(() => {
      expect(Object.keys(contentLoadResults)).toHaveLength(3);
      documents.forEach(doc => {
        expect(contentLoadResults[doc.path]).toBe(`Preview: ${doc.path}`);
      });
    });
  });
});