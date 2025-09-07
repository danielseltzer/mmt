# Table View Hooks

## useTableSelection

A React hook that provides a reactive interface for managing table selection state using a TableCore instance.

### Usage Example

```tsx
import React from 'react';
import { TableCore } from '@mmt/table-view';
import { useTableSelection } from '@mmt/table-view';

function MyTable({ documents }) {
  // Create or get a TableCore instance
  const tableCore = React.useMemo(() => {
    return new TableCore({
      documents,
      onSelectionChange: (selectedPaths) => {
        console.log('Selection changed:', selectedPaths);
      }
    });
  }, [documents]);

  // Use the selection hook
  const {
    selectedRows,
    selectedCount,
    isRowSelected,
    isAllSelected,
    isSomeSelected,
    handleRowClick,
    clearSelection,
    selectAll,
    toggleAllSelection,
    toggleRowSelection,
    selectRange
  } = useTableSelection(tableCore);

  return (
    <div>
      {/* Selection controls */}
      <div>
        <button onClick={selectAll}>Select All</button>
        <button onClick={clearSelection}>Clear Selection</button>
        <span>{selectedCount} items selected</span>
      </div>

      {/* Table with selectable rows */}
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={isAllSelected}
                indeterminate={isSomeSelected}
                onChange={() => toggleAllSelection()}
              />
            </th>
            <th>Name</th>
            <th>Path</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr 
              key={doc.path}
              onClick={(e) => handleRowClick(doc.path, e.shiftKey)}
              className={isRowSelected(doc.path) ? 'selected' : ''}
            >
              <td>
                <input
                  type="checkbox"
                  checked={isRowSelected(doc.path)}
                  onChange={() => toggleRowSelection(doc.path)}
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
              <td>{doc.metadata.name}</td>
              <td>{doc.path}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### API

#### Parameters

- `tableCore: TableCore | null` - The TableCore instance to manage selection for. Can be null if not yet initialized.

#### Returns

An object with the following properties and methods:

##### State Properties

- `selectedRows: string[]` - Array of currently selected row IDs
- `selectedCount: number` - Number of selected rows
- `isAllSelected: boolean` - Whether all rows are selected
- `isSomeSelected: boolean` - Whether some (but not all) rows are selected

##### Methods

- `handleRowClick(rowId: string, shiftKey?: boolean): void`
  - Handle row selection on click
  - With shiftKey, selects range from last selected

- `clearSelection(): void`
  - Clear all selections

- `selectAll(): void`
  - Select all rows in the table

- `toggleAllSelection(): void`
  - Toggle selection of all rows

- `getSelectedCount(): number`
  - Get the count of selected rows

- `isRowSelected(rowId: string): boolean`
  - Check if a specific row is selected

- `toggleRowSelection(rowId: string): void`
  - Toggle selection of a specific row

- `selectRange(fromId: string, toId: string): void`
  - Select a range of rows between two IDs

### Features

- **Shift-click range selection**: Hold shift while clicking to select a range
- **Reactive state**: Automatically syncs with TableCore instance
- **Null-safe**: Handles null TableCore instance gracefully
- **TypeScript support**: Fully typed for better IDE support

### Testing

The hook follows the project's NO MOCKS policy and is tested with real TableCore instances. See the test file for comprehensive examples of all functionality.