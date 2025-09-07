import { useState, useCallback, useEffect } from 'react';
import { TableCore } from '../core/TableCore';

export interface UseTableSelectionReturn {
  /** Array of currently selected row IDs */
  selectedRows: string[];
  /** Number of selected rows */
  selectedCount: number;
  /** Check if a specific row is selected */
  isRowSelected: (rowId: string) => boolean;
  /** Check if all rows are selected */
  isAllSelected: boolean;
  /** Check if some (but not all) rows are selected */
  isSomeSelected: boolean;
  /** Handle row click with optional shift key for range selection */
  handleRowClick: (rowId: string, shiftKey?: boolean) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Select all rows in the table */
  selectAll: () => void;
  /** Toggle selection of all rows */
  toggleAllSelection: () => void;
  /** Get count of selected rows */
  getSelectedCount: () => number;
  /** Toggle selection of a specific row */
  toggleRowSelection: (rowId: string) => void;
  /** Select a range of rows between two row IDs */
  selectRange: (fromId: string, toId: string) => void;
}

/**
 * React hook for managing table selection state using TableCore instance
 * Provides a reactive interface to TableCore's selection methods
 * 
 * @param tableCore - TableCore instance to manage selection for
 * @returns Selection state and control methods
 */
export function useTableSelection(tableCore: TableCore | null): UseTableSelectionReturn {
  // Initialize state from TableCore if available
  const [selectedRows, setSelectedRows] = useState<string[]>(() => {
    return tableCore ? tableCore.getSelectedRows() : [];
  });

  // Sync state when tableCore changes or selection changes
  useEffect(() => {
    if (!tableCore) {
      setSelectedRows([]);
      return;
    }

    // Initial sync
    setSelectedRows(tableCore.getSelectedRows());

    // Create a sync function that we can call from TableCore callbacks
    const syncSelection = () => {
      setSelectedRows(tableCore.getSelectedRows());
    };

    // Listen for selection changes if the TableCore instance supports it
    // Note: This assumes TableCore might emit events or have a subscription mechanism
    // Since TableCore uses callbacks in options, we rely on methods being called
    // to trigger re-renders through state updates
    
    return () => {
      // Cleanup if needed
    };
  }, [tableCore]);

  // Handle row click with optional shift key for range selection
  const handleRowClick = useCallback((rowId: string, shiftKey: boolean = false) => {
    if (!tableCore) return;
    
    // Use TableCore's selectRow method which handles shift key internally
    tableCore.selectRow(rowId, shiftKey);
    setSelectedRows(tableCore.getSelectedRows());
  }, [tableCore]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    if (!tableCore) return;
    
    tableCore.clearSelection();
    setSelectedRows([]);
  }, [tableCore]);

  // Select all rows
  const selectAll = useCallback(() => {
    if (!tableCore) return;
    
    tableCore.selectAll();
    setSelectedRows(tableCore.getSelectedRows());
  }, [tableCore]);

  // Toggle selection of all rows
  const toggleAllSelection = useCallback(() => {
    if (!tableCore) return;
    
    tableCore.toggleAllSelection();
    setSelectedRows(tableCore.getSelectedRows());
  }, [tableCore]);

  // Get count of selected rows
  const getSelectedCount = useCallback(() => {
    return selectedRows.length;
  }, [selectedRows]);

  // Check if a specific row is selected
  const isRowSelected = useCallback((rowId: string) => {
    if (!tableCore) return false;
    return tableCore.isRowSelected(rowId);
  }, [tableCore]);

  // Toggle selection of a specific row
  const toggleRowSelection = useCallback((rowId: string) => {
    if (!tableCore) return;
    
    tableCore.toggleRowSelection(rowId);
    setSelectedRows(tableCore.getSelectedRows());
  }, [tableCore]);

  // Select a range of rows
  const selectRange = useCallback((fromId: string, toId: string) => {
    if (!tableCore) return;
    
    tableCore.selectRange(fromId, toId);
    setSelectedRows(tableCore.getSelectedRows());
  }, [tableCore]);

  // Compute derived states
  const isAllSelected = tableCore ? tableCore.isAllSelected() : false;
  const isSomeSelected = tableCore ? tableCore.isSomeSelected() : false;
  const selectedCount = selectedRows.length;

  return {
    selectedRows,
    selectedCount,
    isRowSelected,
    isAllSelected,
    isSomeSelected,
    handleRowClick,
    clearSelection,
    selectAll,
    toggleAllSelection,
    getSelectedCount,
    toggleRowSelection,
    selectRange,
  };
}