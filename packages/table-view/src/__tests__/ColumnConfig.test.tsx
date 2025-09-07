import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ColumnConfig } from '../ColumnConfig';
import { describe, it, expect, vi } from 'vitest';

describe('ColumnConfig Component', () => {
  const mockColumns = [
    { id: 'name', label: 'Name' },
    { id: 'path', label: 'Path' },
    { id: 'modified', label: 'Modified' },
    { id: 'size', label: 'Size' },
    { id: 'tags', label: 'Tags' },
  ];

  const defaultVisibility = {
    name: true,
    path: true,
    modified: true,
    size: true,
    tags: false,
  };

  it('should render without errors', () => {
    const onVisibilityChange = vi.fn();
    
    render(
      <ColumnConfig
        columns={mockColumns}
        visibility={defaultVisibility}
        onVisibilityChange={onVisibilityChange}
      />
    );

    expect(screen.getByText('Columns')).toBeInTheDocument();
  });

  it('should open dropdown when button is clicked', async () => {
    const onVisibilityChange = vi.fn();
    
    render(
      <ColumnConfig
        columns={mockColumns}
        visibility={defaultVisibility}
        onVisibilityChange={onVisibilityChange}
      />
    );

    const button = screen.getByTestId('columns-config-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Path')).toBeInTheDocument();
      expect(screen.getByText('Modified')).toBeInTheDocument();
    });
  });

  it('should close dropdown when clicking outside', async () => {
    const onVisibilityChange = vi.fn();
    
    render(
      <div>
        <div data-testid="outside">Outside element</div>
        <ColumnConfig
          columns={mockColumns}
          visibility={defaultVisibility}
          onVisibilityChange={onVisibilityChange}
        />
      </div>
    );

    const button = screen.getByTestId('columns-config-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('Name')).not.toBeInTheDocument();
    });
  });

  it('should toggle column visibility when checkbox is clicked', async () => {
    const onVisibilityChange = vi.fn();
    
    render(
      <ColumnConfig
        columns={mockColumns}
        visibility={defaultVisibility}
        onVisibilityChange={onVisibilityChange}
      />
    );

    const button = screen.getByTestId('columns-config-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    const tagsCheckbox = screen.getByRole('checkbox', { name: /Tags/i });
    fireEvent.click(tagsCheckbox);

    expect(onVisibilityChange).toHaveBeenCalledWith({
      ...defaultVisibility,
      tags: true,
    });
  });

  it('should not include preview column if not in columns list', () => {
    const onVisibilityChange = vi.fn();
    
    render(
      <ColumnConfig
        columns={mockColumns}
        visibility={defaultVisibility}
        onVisibilityChange={onVisibilityChange}
      />
    );

    const button = screen.getByTestId('columns-config-button');
    fireEvent.click(button);

    expect(screen.queryByText('Preview')).not.toBeInTheDocument();
  });

  it('should handle rapid open/close without errors', async () => {
    const onVisibilityChange = vi.fn();
    
    render(
      <ColumnConfig
        columns={mockColumns}
        visibility={defaultVisibility}
        onVisibilityChange={onVisibilityChange}
      />
    );

    const button = screen.getByTestId('columns-config-button');
    
    // Rapidly click to open and close
    for (let i = 0; i < 10; i++) {
      fireEvent.click(button);
    }

    // Should not throw any errors
    expect(screen.getByTestId('columns-config-button')).toBeInTheDocument();
  });
});