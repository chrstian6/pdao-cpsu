// lib/store/auth-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { checkAuthAction } from "@/actions/auth";

interface User {
  admin_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  age: number;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => boolean;
  syncWithServer: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: (user: User) => {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      checkAuth: () => {
        return get().isAuthenticated;
      },

      syncWithServer: async () => {
        try {
          // Use server action to check auth
          const result = await checkAuthAction();

          if (result.authenticated && result.user) {
            set({
              user: result.user,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          }

          // If server says not authenticated, clear local state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return false;
        } catch (error) {
          console.error("Failed to sync with server:", error);
          set({ isLoading: false });
          return false;
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
