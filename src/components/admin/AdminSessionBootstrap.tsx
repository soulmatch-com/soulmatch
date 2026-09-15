'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAdminStore } from '@/modules/admin'

export function AdminSessionBootstrap() {
  const pathname = usePathname()
  const router = useRouter()
  const { setAdmin, clearAdmin } = useAdminStore()

  useEffect(() => {
    if (pathname === '/admin/login') return

    let cancelled = false

    async function syncAdminSession() {
      const response = await fetch('/api/admin/auth/me')

      if (cancelled) return

      if (response.ok) {
        const data = await response.json()
        setAdmin(data.admin)
        return
      }

      clearAdmin()
      router.replace('/admin/login')
    }

    syncAdminSession().catch(() => {
      if (!cancelled) {
        clearAdmin()
        router.replace('/admin/login')
      }
    })

    return () => {
      cancelled = true
    }
  }, [pathname, router, setAdmin, clearAdmin])

  return null
}
