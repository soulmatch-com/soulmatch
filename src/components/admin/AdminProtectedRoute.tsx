'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminStore } from '@/store/adminStore'

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/admin/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated()) {
    return null
  }

  return <>{children}</>
}
