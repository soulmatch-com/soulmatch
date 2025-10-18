import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface Admin {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'moderator'
}

interface AdminStore {
  admin: Admin | null
  setAdmin: (admin: Admin | null) => void
  clearAdmin: () => void
  isAuthenticated: () => boolean
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      admin: null,
      setAdmin: (admin) => set({ admin }),
      clearAdmin: () => set({ admin: null }),
      isAuthenticated: () => get().admin !== null,
    }),
    {
      name: 'admin-storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      }),
    }
  )
)
