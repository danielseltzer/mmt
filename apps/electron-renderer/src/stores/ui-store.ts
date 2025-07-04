import { create } from 'zustand';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persistent
  createdAt: Date;
}

interface UIStore {
  // State
  notifications: Notification[];
  globalLoading: boolean;
  globalError: string | null;
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  preferencesOpen: boolean;
  
  // Actions
  showNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  setGlobalLoading: (loading: boolean) => void;
  setGlobalError: (error: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setPreferencesOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial state
  notifications: [],
  globalLoading: false,
  globalError: null,
  sidebarOpen: true,
  commandPaletteOpen: false,
  preferencesOpen: false,
  
  // Actions
  showNotification: (notification) => {
    const id = `notif-${Date.now()}`;
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: new Date(),
    };
    
    set(state => ({
      notifications: [...state.notifications, newNotification],
    }));
    
    // Auto-dismiss after duration (if specified)
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        get().dismissNotification(id);
      }, notification.duration);
    }
    
    return id;
  },
  
  dismissNotification: (id) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id),
    }));
  },
  
  clearNotifications: () => {
    set({ notifications: [] });
  },
  
  setGlobalLoading: (loading) => {
    set({ globalLoading: loading });
  },
  
  setGlobalError: (error) => {
    set({ globalError: error });
    
    // Show error notification if error is set
    if (error) {
      get().showNotification({
        type: 'error',
        title: 'Error',
        message: error,
        duration: 5000,
      });
    }
  },
  
  toggleSidebar: () => {
    set(state => ({ sidebarOpen: !state.sidebarOpen }));
  },
  
  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },
  
  setCommandPaletteOpen: (open) => {
    set({ commandPaletteOpen: open });
  },
  
  setPreferencesOpen: (open) => {
    set({ preferencesOpen: open });
  },
}));