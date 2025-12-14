import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthTokens } from '../types';
import authService from '../services/authService';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => Promise<void>;
  logout: () => void;
  getCurrentUser: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login({ email, password });
          set({
            user: response.user,
            tokens: response.tokens,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register(data);
          set({
            user: response.user,
            tokens: response.tokens,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        authService.logout();
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
        });
      },

      getCurrentUser: async () => {
        const { isAuthenticated } = get();
        console.log('getCurrentUser called:', {
          isAuthenticated,
          timestamp: new Date().toISOString()
        });

        // Check localStorage directly for tokens to ensure sync
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');

        if (!accessToken || !refreshToken) {
          console.log('getCurrentUser: no tokens, clearing auth state');
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        // If we have tokens but store says not authenticated, update store
        if (!isAuthenticated) {
          console.log('getCurrentUser: updating store state - tokens exist in localStorage');
          set({
            isAuthenticated: true,
            tokens: { access: accessToken, refresh: refreshToken }
          });
        }

        set({ isLoading: true });
        try {
          console.log('getCurrentUser: calling authService.getCurrentUser');
          const user = await authService.getCurrentUser();
          console.log('getCurrentUser: authService.getCurrentUser result:', user ? 'success' : 'null');
          if (user) {
            set({ user, isLoading: false });
          } else {
            // authService.getCurrentUser already handles token cleanup on null
            console.log('getCurrentUser: authService returned null, checking tokens');
            // Check if tokens were cleared by authService
            const hasTokensAfterCall = !!localStorage.getItem('access_token');
            if (!hasTokensAfterCall) {
              console.log('getCurrentUser: tokens were cleared by authService, updating store');
              set({
                user: null,
                tokens: null,
                isAuthenticated: false,
                isLoading: false,
              });
            } else {
              set({ isLoading: false });
            }
          }
        } catch (error) {
          // authService.getCurrentUser already handles token cleanup on error
          console.warn('Failed to get current user:', error);
          // Check if tokens were cleared by authService
          const hasTokensAfterCall = !!localStorage.getItem('access_token');
          if (!hasTokensAfterCall) {
            console.log('getCurrentUser: tokens were cleared by authService due to error');
            set({
              user: null,
              tokens: null,
              isAuthenticated: false,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        }
      },

      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('authStore onRehydrateStorage:', state);
        // Don't modify state in onRehydrateStorage as it can cause loops
        // The getCurrentUser logic will handle the synchronization
      },
    }
  )
);