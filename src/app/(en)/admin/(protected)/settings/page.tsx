'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminStore } from '@/store/adminStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminSettingsPage() {
  const { isAuthenticated } = useAdminStore()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isAuthenticated()) {
      router.push('/admin/login')
    }
  }, [isAuthenticated, mounted, router])

  // The persisted admin state only exists in the browser. Rendering the same
  // placeholder on the server and the initial client pass prevents hydration
  // from comparing an anonymous server tree with an authenticated client tree.
  if (!mounted || !isAuthenticated()) {
    return null
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-2">Configure admin panel settings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin Settings</CardTitle>
            <CardDescription>System configuration and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">Settings interface coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
