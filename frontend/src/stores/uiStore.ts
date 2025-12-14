import { create } from 'zustand';

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Modals
  modals: {
    documentUpload: boolean;
    settings: boolean;
    profile: boolean;
  };
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;

  // Loading states
  loading: {
    global: boolean;
    documents: boolean;
    agent: boolean;
  };
  setGlobalLoading: (loading: boolean) => void;
  setDocumentsLoading: (loading: boolean) => void;
  setAgentLoading: (loading: boolean) => void;

  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
  }>;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  // Theme
  theme: 'system',
  setTheme: (theme: 'light' | 'dark' | 'system') => set({ theme }),

  // Modals
  modals: {
    documentUpload: false,
    settings: false,
    profile: false,
  },
  openModal: (modal) =>
    set((state) => ({
      modals: { ...state.modals, [modal]: true },
    })),
  closeModal: (modal) =>
    set((state) => ({
      modals: { ...state.modals, [modal]: false },
    })),
  closeAllModals: () =>
    set({
      modals: {
        documentUpload: false,
        settings: false,
        profile: false,
      },
    }),

  // Loading states
  loading: {
    global: false,
    documents: false,
    agent: false,
  },
  setGlobalLoading: (global) =>
    set((state) => ({ loading: { ...state.loading, global } })),
  setDocumentsLoading: (documents) =>
    set((state) => ({ loading: { ...state.loading, documents } })),
  setAgentLoading: (agent) =>
    set((state) => ({ loading: { ...state.loading, agent } })),

  // Notifications
  notifications: [],
  addNotification: (notification) => {
    const id = Date.now().toString();
    const newNotification = { ...notification, id };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Auto remove notification after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, notification.duration || 5000);
    }
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));