'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminStore } from '@/modules/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, Heart, MessageSquare } from 'lucide-react'

interface DashboardStats {
  totalUsers: number
  activeProfiles: number
  pendingVerification: number
  incompleteProfiles: number
  suspendedProfiles: number
  recentRegistrations: number
}

interface LatestUser {
  user_id: string
  first_name: string
  last_name: string
  created_at: string
  profile_status: string
}

interface PendingProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  profile_status: string
  is_verified: boolean
  created_at: string
}

export default function AdminDashboardPage() {
  const { admin, clearAdmin } = useAdminStore()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [latestUsers, setLatestUsers] = useState<LatestUser[]>([])
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setLatestUsers(data.latestUsers)
        setPendingProfiles(data.pendingProfiles || [])
      } else if (response.status === 401 || response.status === 403) {
        clearAdmin()
        router.replace('/admin/login')
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statsCards = stats ? [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      description: `${stats.recentRegistrations} new in last 30 days`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Active Profiles',
      value: stats.activeProfiles.toLocaleString(),
      icon: UserCheck,
      description: 'Verified and active',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Pending Verification',
      value: stats.pendingVerification.toLocaleString(),
      icon: Heart,
      description: 'Awaiting verification',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Incomplete Profiles',
      value: stats.incompleteProfiles.toLocaleString(),
      icon: MessageSquare,
      description: 'Not yet completed',
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
    },
  ] : []

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-600 mt-2">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600 mt-2">Welcome back, {admin?.name || admin?.email || 'Admin'}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                  <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent User Registrations</CardTitle>
              <CardDescription>Latest users who joined the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {latestUsers.length > 0 ? (
                  latestUsers.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between border-b border-slate-200 pb-3 last:border-0">
                      <div>
                        <p className="font-medium text-slate-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-slate-500">Status: {user.profile_status}</p>
                      </div>
                      <p className="text-xs text-slate-400">{formatTimeAgo(user.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No recent registrations</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile Verification Queue</CardTitle>
              <CardDescription>
                {stats?.pendingVerification || 0} profiles pending verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingProfiles.length > 0 ? (
                  <>
                    {pendingProfiles.map((profile) => (
                      <div key={profile.id} className="flex items-center justify-between border-b border-slate-200 pb-3 last:border-0">
                        <div>
                          <p className="font-medium text-slate-900">
                            {profile.first_name} {profile.last_name}
                          </p>
                          <p className="text-sm text-slate-500">
                            Status: {profile.profile_status}
                            {profile.profile_status === 'active' && !profile.is_verified && ' (Unverified)'}
                          </p>
                        </div>
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Pending
                        </span>
                      </div>
                    ))}
                    {stats && stats.pendingVerification > pendingProfiles.length && (
                      <button
                        onClick={() => router.push('/admin/profiles')}
                        className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
                      >
                        View all {stats.pendingVerification} profiles →
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">No pending verifications</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
