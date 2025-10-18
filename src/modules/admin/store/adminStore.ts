// Admin State Management
// Part of the admin module - can be moved to microservice later

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { ADMIN_CONFIG } from '../config'
import type { Admin } from '../types'

interface AdminStore {
  admin: Admin | null
  token: string | null
  setAdmin: (admin: Admin | null) => void
  setToken: (token: string | null) => void
  clearAdmin: () => void
  isAuthenticated: () => boolean
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      setAdmin: (admin) => set({ admin }),
      setToken: (token) => set({ token }),
      clearAdmin: () => set({ admin: null, token: null }),
      isAuthenticated: () => get().admin !== null,
    }),
    {
      name: ADMIN_CONFIG.AUTH.STORAGE_KEY,
      storage: createJSONStorage(() => {
        // Check if we're on the client side
        if (typeof window !== 'undefined') {
          return localStorage
        }
        // Return a dummy storage for server-side
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      }),
    }
  )
)
