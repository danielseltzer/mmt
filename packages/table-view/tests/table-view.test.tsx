import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TableView } from '../src/TableView';
import type { Document } from '@mmt/entities';

// Helper to generate test documents
function generateDocuments(count: number): Document[] {
  return Array.from({ length: count }, (_, i) => ({
    path: `/vault/doc-${i}.md`,
    content: `Content for document ${i}`,
    metadata: {
      name: `doc-${i}`,
      modified: new Date(2024, 0, i + 1),
      size: 1024 + i * 100,
      frontmatter: {},
      tags: [`tag-${i % 5}`],
      links: [],
    },
  }));
}

describe('Table View Component', () => {
  const mockOnSelectionChange = vi.fn();
  const mockOnOperationRequest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 500 documents without performance issues', async () => {
    // GIVEN: 500 documents
    const documents = generateDocuments(500);
    
    // WHEN: Rendering the table
    const startTime = performance.now();
    render(
      <TableView 
        documents={documents}
        onSelectionChange={mockOnSelectionChange}
        onOperationRequest={mockOnOperationRequest}
      />
    );
    const renderTime = performance.now() - startTime;
    
    // THEN: Should render quickly and show all 500 rows
    expect(renderTime).toBeLessThan(1000); // Should render in less than 1 second
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(501); // 500 data rows + 1 header row
  });

  it('shows message when results exceed 500: "Showing first 500 of 1234 results"', () => {
    // GIVEN: 1234 documents (but only 500 will be displayed)
    const documents = generateDocuments(1234);
    
    // WHEN: Rendering the table
    render(
      <TableView 
        documents={documents}
        onSelectionChange={mockOnSelectionChange}
        onOperationRequest={mockOnOperationRequest}
      />
    );
    
    // THEN: Should show limit message
    expect(screen.getByText('Showing first 500 of 1234 results')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(501); // Only 500 data rows + 1 header
  });

  it('sorts by filename when header clicked', async () => {
    // GIVEN: Documents with different names
    const documents = [
      generateDocuments(1)[0], // doc-0
      { ...generateDocuments(2)[1], metadata: { ...generateDocuments(2)[1].metadata, name: 'aaa-doc' } },
      { ...generateDocuments(3)[2], metadata: { ...generateDocuments(3)[2].metadata, name: 'zzz-doc' } },
    ];
    
    // WHEN: Clicking the name header
    render(
      <TableView 
        documents={documents}
        onSelectionChange={mockOnSelectionChange}
        onOperationRequest={mockOnOperationRequest}
      />
    );
    
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
    const documents = generateDocuments(3); // Will have dates Jan 1, 2, 3
    
    // WHEN: Clicking the modified header twice
    render(
      <TableView 
        documents={documents}
        onSelectionChange={mockOnSelectionChange}
        onOperationRequest={mockOnOperationRequest}
      />
    );
    
    const modifiedHeader = screen.getByText('Modified');
    await userEvent.click(modifiedHeader); // First click - ascending
    await userEvent.click(modifiedHeader); // Second click - descending
    
    // THEN: Should sort by date descending (newest first)
    const cells = screen.getAllByTestId('modified-cell');
    expect(cells[0]).toHaveTextContent('1/3/2024'); // Jan 3
    expect(cells[1]).toHaveTextContent('1/2/2024'); // Jan 2
    expect(cells[2]).toHaveTextContent('1/1/2024'); // Jan 1
  });

  it('hides column when right-click -> hide', async () => {
    // GIVEN: A table with visible columns
    const documents = generateDocuments(3);
    
    // WHEN: Right-clicking on a column header and selecting hide
    render(
      <TableView 
        documents={documents}
        onSelectionChange={mockOnSelectionChange}
        onOperationRequest={mockOnOperationRequest}
      />
    );
    
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
    const documents = generateDocuments(5);
    
    // WHEN: Clicking the header checkbox
    render(
      <TableView 
        documents={documents}
        onSelectionChange={mockOnSelectionChange}
        onOperationRequest={mockOnOperationRequest}
      />
    );
    
    const headerCheckbox = screen.getByTestId('select-all-checkbox');
    await userEvent.click(headerCheckbox);
    
    // THEN: All rows should be selected
    await waitFor(() => {
      expect(mockOnSelectionChange).toHaveBeenCalledWith(
        documents.map(d => d.path)
      );
    });
    
    const rowCheckboxes = screen.getAllByRole('checkbox', { checked: true });
    expect(rowCheckboxes).toHaveLength(6); // 5 rows + 1 header
  });

  it('selects range with shift-click', async () => {
    // GIVEN: A table with documents
    const documents = generateDocuments(5);
    
    // WHEN: Clicking first row, then shift-clicking third row
    render(
      <TableView 
        documents={documents}
        onSelectionChange={mockOnSelectionChange}
        onOperationRequest={mockOnOperationRequest}
      />
    );
    
    const checkboxes = screen.getAllByRole('checkbox').slice(1); // Skip header checkbox
    await userEvent.click(checkboxes[0]); // Select first
    await userEvent.click(checkboxes[2], { shiftKey: true }); // Shift-click third
    
    // THEN: First three rows should be selected
    await waitFor(() => {
      expect(mockOnSelectionChange).toHaveBeenLastCalledWith([
        documents[0].path,
        documents[1].path,
        documents[2].path,
      ]);
    });
  });

  it('emits operation event with selected documents', async () => {
    // GIVEN: A table with some selected documents
    const documents = generateDocuments(3);
    
    // WHEN: Selecting documents and requesting an operation
    render(
      <TableView 
        documents={documents}
        onSelectionChange={mockOnSelectionChange}
        onOperationRequest={mockOnOperationRequest}
      />
    );
    
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
    expect(mockOnOperationRequest).toHaveBeenCalledWith({
      operation: 'move',
      documentPaths: [documents[0].path, documents[1].path],
    });
  });

  it('preserves column widths after resize', async () => {
    // GIVEN: A table with resizable columns
    const documents = generateDocuments(3);
    
    // WHEN: Resizing a column
    render(
      <TableView 
        documents={documents}
        onSelectionChange={mockOnSelectionChange}
        onOperationRequest={mockOnOperationRequest}
      />
    );
    
    const nameHeader = screen.getByTestId('column-header-name');
    const resizeHandle = nameHeader.querySelector('.resize-handle');
    
    // Simulate drag to resize
    fireEvent.mouseDown(resizeHandle!);
    fireEvent.mouseMove(document, { clientX: 200 });
    fireEvent.mouseUp(document);
    
    // Re-render to check persistence
    const { rerender } = render(
      <TableView 
        documents={documents}
        onSelectionChange={mockOnSelectionChange}
        onOperationRequest={mockOnOperationRequest}
      />
    );
    
    // THEN: Column width should be preserved
    const nameHeaderAfter = screen.getByTestId('column-header-name');
    expect(nameHeaderAfter).toHaveStyle({ width: '200px' });
  });

  it('loads preview text only when preview column visible', async () => {
    // GIVEN: Documents with content
    const documents = generateDocuments(3);
    const mockLoadContent = vi.fn().mockResolvedValue('Preview content');
    
    // WHEN: Preview column is initially hidden
    render(
      <TableView 
        documents={documents}
        onSelectionChange={mockOnSelectionChange}
        onOperationRequest={mockOnOperationRequest}
        onLoadContent={mockLoadContent}
        initialColumns={['name', 'path', 'modified']} // No preview
      />
    );
    
    // THEN: Content should not be loaded
    expect(mockLoadContent).not.toHaveBeenCalled();
    
    // WHEN: Showing the preview column
    const columnsButton = screen.getByTestId('columns-config-button');
    await userEvent.click(columnsButton);
    
    const previewCheckbox = screen.getByLabelText('Preview');
    await userEvent.click(previewCheckbox);
    
    // THEN: Content should be loaded for visible documents
    await waitFor(() => {
      expect(mockLoadContent).toHaveBeenCalledTimes(3);
    });
  });
});