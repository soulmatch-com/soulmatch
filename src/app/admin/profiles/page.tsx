'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminStore } from '@/store/adminStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminProfilesPage() {
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

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Profile Management</h1>
          <p className="text-slate-600 mt-2">Manage user profiles and verifications</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Profiles</CardTitle>
            <CardDescription>View and verify user profiles</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">Profile management interface coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
