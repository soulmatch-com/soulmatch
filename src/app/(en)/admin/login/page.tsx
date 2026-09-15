'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminStore } from '@/store/adminStore'
import { AdminLoginForm } from '@/components/admin/AdminLoginForm'

export default function AdminLoginPage() {
  const router = useRouter()
  const { isAuthenticated } = useAdminStore()
  const [mounted, setMounted] = useState(false)
  const [checkedAuth, setCheckedAuth] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Only check authentication once when component mounts
    if (mounted && !checkedAuth) {
      setCheckedAuth(true)
      if (isAuthenticated()) {
        // Already logged in, redirect to dashboard
        router.push('/admin/dashboard')
      }
    }
  }, [mounted, checkedAuth, isAuthenticated, router])

  // Show login form during SSR to avoid hydration mismatch
  if (!mounted) {
    return <AdminLoginForm />
  }

  return <AdminLoginForm />
}
