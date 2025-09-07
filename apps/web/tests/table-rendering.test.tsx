import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TableView, configureApiBaseUrl } from '@mmt/table-view';

describe('Table Rendering', () => {
  beforeAll(() => {
    // Configure API base URL for TableView
    configureApiBaseUrl('http://localhost:3001');
  });

  const mockDocuments = [
    {
      path: '/test/doc1.md',
      metadata: {
        name: 'Document 1',
        modified: '2024-01-10T12:00:00.000Z',
        size: 1024,
        tags: [],
        frontmatter: {}
      }
    },
    {
      path: '/test/doc2.md',
      metadata: {
        name: 'Document 2',
        modified: '2024-01-11T15:30:00.000Z',
        size: 2048,
        tags: [],
        frontmatter: {}
      }
    }
  ];

  it('should render correct number of rows without duplicates', () => {
    const { container } = render(
      <TableView 
        documents={mockDocuments} 
        disableVirtualization={true}
      />
    );
    
    // Get all rows (excluding header)
    const tbody = container.querySelector('tbody');
    const rows = tbody?.querySelectorAll('tr');
    
    // Should have exactly 2 data rows
    expect(rows).toHaveLength(2);
  });

  it('should not have empty rows between data rows', () => {
    const { container } = render(
      <TableView 
        documents={mockDocuments} 
        disableVirtualization={true}
      />
    );
    
    const tbody = container.querySelector('tbody');
    const rows = tbody?.querySelectorAll('tr');
    
    // Check each row has content
    rows?.forEach((row) => {
      expect(row.textContent).not.toBe('');
      expect(row.querySelector('[data-testid="name-cell"]')).toBeTruthy();
    });
  });

  it('should have single tbody element', () => {
    const { container } = render(
      <TableView 
        documents={mockDocuments} 
        disableVirtualization={true}
      />
    );
    
    const tbodies = container.querySelectorAll('tbody');
    expect(tbodies).toHaveLength(1);
  });
});