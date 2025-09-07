import { useState, useCallback } from 'react';
import { Loggers } from '@mmt/logger';
import { getApiEndpoint } from '../config/api';

const logger = Loggers.web();

export interface ContextMenuPosition {
  x: number;
  y: number;
}

// Re-export MenuItem from ContextMenu component
export type { MenuItem } from '../components/ContextMenu';
import type { MenuItem } from '../components/ContextMenu';

export interface ContextMenuState {
  isOpen: boolean;
  position: ContextMenuPosition;
  menuType: 'column' | 'row' | null;
  targetId: string | null;
}

export interface ContextMenuContext {
  documents: any[];
  table: any;
  vaultId: string;
  onPreview: (documentPath: string) => void;
  onHideColumn: (columnId: string) => void;
  onOperation: (operation: string, documentPaths: string[]) => void;
  rowSelection: Record<string, boolean>;
}

export interface UseContextMenuReturn {
  isOpen: boolean;
  position: ContextMenuPosition;
  menuType: 'column' | 'row' | null;
  targetId: string | null;
  showContextMenu: (event: React.MouseEvent, type: 'column' | 'row', id?: string) => void;
  hideContextMenu: () => void;
  getMenuItems: (type: 'column' | 'row' | null, id?: string, context?: ContextMenuContext) => MenuItem[];
}

/**
 * Custom hook for managing context menu state
 * Handles both column and row context menus with appropriate menu items
 */
export function useContextMenu(): UseContextMenuReturn {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    menuType: null,
    targetId: null,
  });

  /**
   * Show context menu at mouse position
   */
  const showContextMenu = useCallback((
    event: React.MouseEvent,
    type: 'column' | 'row',
    id?: string
  ) => {
    event.preventDefault();
    event.stopPropagation();
    
    setState({
      isOpen: true,
      position: {
        x: event.clientX,
        y: event.clientY,
      },
      menuType: type,
      targetId: id || null,
    });
  }, []);

  /**
   * Hide context menu
   */
  const hideContextMenu = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      menuType: null,
      targetId: null,
    }));
  }, []);

  /**
   * Get menu items based on type and context
   */
  const getMenuItems = useCallback((
    type: 'column' | 'row' | null,
    id?: string,
    context?: ContextMenuContext
  ): MenuItem[] => {
    if (type === 'column') {
      return getColumnMenuItems(id, context);
    } else if (type === 'row') {
      return getRowMenuItems(id, context);
    }
    return [];
  }, []);

  return {
    isOpen: state.isOpen,
    position: state.position,
    menuType: state.menuType,
    targetId: state.targetId,
    showContextMenu,
    hideContextMenu,
    getMenuItems,
  };
}

/**
 * Get column-specific menu items
 */
function getColumnMenuItems(columnId?: string, context?: ContextMenuContext): MenuItem[] {
  const items: MenuItem[] = [];
  
  if (columnId && context) {
    items.push({
      id: 'hide-column',
      label: 'Hide Column',
      action: () => {
        context.onHideColumn(columnId);
      },
    });
  }
  
  return items;
}

/**
 * Get row-specific menu items
 */
function getRowMenuItems(rowId?: string, context?: ContextMenuContext): MenuItem[] {
  const items: MenuItem[] = [];
  
  if (!rowId || !context) {
    return items;
  }

  const { documents, table, vaultId, onPreview, onOperation, rowSelection } = context;
  const doc = documents.find((d: any) => (d.fullPath || d.path) === rowId);

  // Preview
  items.push({
    id: 'preview',
    label: 'Preview',
    icon: 'eye',
    action: () => {
      if (doc && doc.metadata?.name) {
        const relativePath = `${doc.metadata.name}.md`;
        onPreview(relativePath);
      }
    },
  });

  // Separator
  items.push({
    id: 'separator-1',
    label: '',
    separator: true,
  });

  // Open in Obsidian
  items.push({
    id: 'open-obsidian',
    label: 'Open in Obsidian',
    icon: 'external-link',
    action: () => {
      if (doc) {
        const fullPath = doc.fullPath || doc.path;
        let vaultName = '';
        let filePath = fullPath;
        
        if (filePath.includes('/Notes/')) {
          const notesIndex = filePath.indexOf('/Notes/');
          const afterNotes = filePath.substring(notesIndex + 7);
          const firstSlashIndex = afterNotes.indexOf('/');
          
          if (firstSlashIndex !== -1) {
            const vaultFolder = afterNotes.substring(0, firstSlashIndex);
            vaultName = vaultFolder
              .replace(/-\d{6}$/, '')
              .replace(/-sync$/, '');
            filePath = afterNotes.substring(firstSlashIndex + 1);
          } else {
            vaultName = afterNotes.replace(/-\d{6}$/, '').replace(/-sync$/, '');
            filePath = '';
          }
        }
        
        if (!vaultName) {
          logger.error('Could not determine Obsidian vault name from path:', fullPath);
          alert('Could not determine Obsidian vault name. The file may not be in an Obsidian vault.');
          return;
        }
        
        const obsidianUri = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}`;
        logger.debug('Opening in Obsidian:', { vaultName, filePath, obsidianUri });
        window.open(obsidianUri, '_blank');
      }
    },
  });

  // Reveal in Finder
  items.push({
    id: 'reveal-finder',
    label: 'Reveal in Finder',
    icon: 'folder-open',
    action: async () => {
      if (table) {
        const row = table.getRowModel().rowsById[rowId];
        if (row && row.original) {
          const fullPath = row.original.fullPath || row.original.path;
          const pathSegments = window.location.pathname.split('/');
          const vaultIndex = pathSegments.indexOf('vaults');
          const currentVaultId = vaultIndex !== -1 ? pathSegments[vaultIndex + 1] : vaultId;
          
          if (currentVaultId) {
            try {
              const response = await fetch(getApiEndpoint(`/api/vaults/${currentVaultId}/documents/reveal-in-finder`), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filePath: fullPath }),
              });
              
              if (!response.ok) {
                const error = await response.json();
                logger.error('Failed to reveal file:', error);
              }
            } catch (error) {
              logger.error('Error revealing file:', error);
            }
          }
        }
      }
    },
  });

  // QuickLook
  items.push({
    id: 'quicklook',
    label: 'QuickLook',
    icon: 'search',
    action: async () => {
      if (table) {
        const row = table.getRowModel().rowsById[rowId];
        if (row && row.original) {
          const fullPath = row.original.fullPath || row.original.path;
          const pathSegments = window.location.pathname.split('/');
          const vaultIndex = pathSegments.indexOf('vaults');
          const currentVaultId = vaultIndex !== -1 ? pathSegments[vaultIndex + 1] : vaultId;
          
          if (currentVaultId) {
            try {
              const response = await fetch(getApiEndpoint(`/api/vaults/${currentVaultId}/documents/quicklook`), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filePath: fullPath }),
              });
              
              if (!response.ok) {
                const error = await response.json();
                logger.error('Failed to preview file:', error);
              }
            } catch (error) {
              logger.error('Error previewing file:', error);
            }
          }
        }
      }
    },
  });

  // Separator
  items.push({
    id: 'separator-2',
    label: '',
    separator: true,
  });

  // Move to...
  items.push({
    id: 'move-to',
    label: 'Move selected',
    icon: 'move',
    action: () => {
      const selectedPaths = Object.keys(rowSelection).filter((key) => rowSelection[key]);
      onOperation('move', selectedPaths);
    },
  });

  // Rename
  items.push({
    id: 'rename',
    label: 'Rename selected',
    icon: 'edit',
    action: () => {
      const selectedPaths = Object.keys(rowSelection).filter((key) => rowSelection[key]);
      onOperation('rename', selectedPaths);
    },
  });

  // Separator
  items.push({
    id: 'separator-3',
    label: '',
    separator: true,
  });

  // Delete
  items.push({
    id: 'delete',
    label: 'Delete selected',
    icon: 'trash',
    action: () => {
      const selectedPaths = Object.keys(rowSelection).filter((key) => rowSelection[key]);
      onOperation('delete', selectedPaths);
    },
  });

  return items;
}