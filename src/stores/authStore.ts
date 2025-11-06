import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface User {
  id: string;
  username?: string;
  email?: string;
  name?: string;
  role?: "ARTIST" | "VENUE" | "ADMIN";
  emailVerified?: boolean;
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: true,

        // Actions
        setUser: (user: User | null) => {
          set(
            {
              user,
              isAuthenticated: !!user,
            },
            false,
            'setUser'
          );
        },

        setLoading: (isLoading: boolean) => {
          set({ isLoading }, false, 'setLoading');
        },

        checkAuth: async () => {
          try {
            set({ isLoading: true }, false, 'checkAuth/start');
            
            const response = await fetch('/api/auth/me', {
              method: 'GET',
              credentials: 'include',
            });

            if (response.ok) {
              const responseData = await response.json();
              get().setUser(responseData.user);
            } else {
              get().setUser(null);
            }
          } catch (error) {
            console.error('Auth check error:', error);
            get().setUser(null);
          } finally {
            set({ isLoading: false }, false, 'checkAuth/end');
          }
        },

        signOut: async () => {
          try {
            const response = await fetch('/api/auth/signout', {
              method: 'POST',
              credentials: 'include',
            });

            if (response.ok) {
              get().setUser(null);
              window.location.href = '/';
            }
          } catch (error) {
            console.error('Sign out error:', error);
            // Force redirect anyway
            get().setUser(null);
            window.location.href = '/';
          }
        },
      }),
      {
        name: 'auth-store',
        // Only persist user data, not loading states
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

// Helper function to trigger auth check from anywhere
export const triggerAuthCheck = () => {
  useAuthStore.getState().checkAuth();
};