import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TableColumn {
  id: string;
  header: string;
  visible: boolean;
  width?: number;
  order: number;
}

export interface ViewConfiguration {
  id: string;
  name: string;
  columns: TableColumn[];
  sortBy?: {
    id: string;
    desc: boolean;
  };
  groupBy?: string;
  rowHeight: 'compact' | 'normal' | 'comfortable';
}

interface ViewStore {
  // State
  views: ViewConfiguration[];
  activeViewId: string | null;
  
  // Computed
  activeView: ViewConfiguration | null;
  
  // Actions
  setActiveView: (viewId: string) => void;
  createView: (view: Omit<ViewConfiguration, 'id'>) => string;
  updateView: (viewId: string, updates: Partial<ViewConfiguration>) => void;
  deleteView: (viewId: string) => void;
  toggleColumn: (columnId: string) => void;
  reorderColumns: (columnIds: string[]) => void;
  setSortBy: (columnId: string, desc: boolean) => void;
  setGroupBy: (columnId: string | undefined) => void;
  setRowHeight: (height: ViewConfiguration['rowHeight']) => void;
}

// Default columns configuration
const defaultColumns: TableColumn[] = [
  { id: 'name', header: 'Name', visible: true, order: 0 },
  { id: 'path', header: 'Path', visible: true, order: 1 },
  { id: 'modified', header: 'Modified', visible: true, order: 2 },
  { id: 'size', header: 'Size', visible: true, order: 3 },
  { id: 'tags', header: 'Tags', visible: true, order: 4 },
];

// Default view
const defaultView: ViewConfiguration = {
  id: 'default',
  name: 'Default View',
  columns: defaultColumns,
  rowHeight: 'normal',
};

export const useViewStore = create<ViewStore>()(
  persist(
    (set, get) => ({
      // Initial state
      views: [defaultView],
      activeViewId: 'default',
      
      // Computed
      get activeView() {
        const { views, activeViewId } = get();
        return views.find(v => v.id === activeViewId) ?? null;
      },
      
      // Actions
      setActiveView: (viewId) => {
        const { views } = get();
        if (views.some(v => v.id === viewId)) {
          set({ activeViewId: viewId });
        }
      },
      
      createView: (view) => {
        const id = `view-${Date.now()}`;
        const newView: ViewConfiguration = { ...view, id };
        set(state => ({ views: [...state.views, newView] }));
        return id;
      },
      
      updateView: (viewId, updates) => {
        set(state => ({
          views: state.views.map(v => 
            v.id === viewId ? { ...v, ...updates } : v
          ),
        }));
      },
      
      deleteView: (viewId) => {
        const { views, activeViewId } = get();
        if (views.length <= 1) return; // Keep at least one view
        
        set(state => {
          const newViews = state.views.filter(v => v.id !== viewId);
          const newActiveId = activeViewId === viewId 
            ? newViews[0]?.id ?? null 
            : activeViewId;
          
          return {
            views: newViews,
            activeViewId: newActiveId,
          };
        });
      },
      
      toggleColumn: (columnId) => {
        const { activeViewId } = get();
        if (!activeViewId) return;
        
        set(state => ({
          views: state.views.map(view => {
            if (view.id !== activeViewId) return view;
            
            return {
              ...view,
              columns: view.columns.map(col =>
                col.id === columnId 
                  ? { ...col, visible: !col.visible }
                  : col
              ),
            };
          }),
        }));
      },
      
      reorderColumns: (columnIds) => {
        const { activeViewId } = get();
        if (!activeViewId) return;
        
        set(state => ({
          views: state.views.map(view => {
            if (view.id !== activeViewId) return view;
            
            const columnMap = new Map(view.columns.map(col => [col.id, col]));
            const reorderedColumns = columnIds
              .map((id, index) => {
                const col = columnMap.get(id);
                return col ? { ...col, order: index } : null;
              })
              .filter((col): col is TableColumn => col !== null);
            
            return { ...view, columns: reorderedColumns };
          }),
        }));
      },
      
      setSortBy: (columnId, desc) => {
        const { activeViewId } = get();
        if (!activeViewId) return;
        
        set(state => ({
          views: state.views.map(view =>
            view.id === activeViewId 
              ? { ...view, sortBy: { id: columnId, desc } }
              : view
          ),
        }));
      },
      
      setGroupBy: (columnId) => {
        const { activeViewId } = get();
        if (!activeViewId) return;
        
        set(state => ({
          views: state.views.map(view =>
            view.id === activeViewId 
              ? { ...view, groupBy: columnId }
              : view
          ),
        }));
      },
      
      setRowHeight: (height) => {
        const { activeViewId } = get();
        if (!activeViewId) return;
        
        set(state => ({
          views: state.views.map(view =>
            view.id === activeViewId 
              ? { ...view, rowHeight: height }
              : view
          ),
        }));
      },
    }),
    {
      name: 'mmt-view-store',
      partialize: (state) => ({
        views: state.views,
        activeViewId: state.activeViewId,
      }),
    }
  )
);