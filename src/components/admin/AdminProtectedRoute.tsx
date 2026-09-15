'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminStore } from '@/modules/admin'

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { clearAdmin } = useAdminStore()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/auth/me').then((response) => {
      if (response.status === 401 || response.status === 403) {
        clearAdmin()
        router.replace('/admin/login')
      }
    })
  }, [clearAdmin, router])

  return <>{children}</>
}
