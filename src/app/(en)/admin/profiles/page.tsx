'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminStore } from '@/modules/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Eye, Filter, Power, PowerOff } from 'lucide-react'

interface Profile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  gender: string
  marital_status: string
  city: string
  state: string
  profile_status: string
  is_verified: boolean
  verified_at: string | null
  created_at: string
  profile_photo_url: string | null
}

export default function AdminProfilesPage() {
  const { clearAdmin } = useAdminStore()
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchProfiles()
  }, [filter, page])

  const fetchProfiles = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })

      if (filter === 'verified') {
        params.set('verified', 'true')
      } else if (filter === 'unverified') {
        params.set('verified', 'false')
      }

      const response = await fetch(`/api/admin/profiles?${params}`)
      const data = await response.json()

      if (response.ok) {
        setProfiles(data.profiles || [])
        setTotalPages(data.pagination?.totalPages || 1)
      } else if (response.status === 401 || response.status === 403) {
        clearAdmin()
        router.replace('/admin/login')
      } else {
        toast.error(data.error || 'Failed to fetch profiles')
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
      toast.error('Failed to load profiles')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyProfile = async (profileId: string, verified: boolean) => {
    try {
      const response = await fetch('/api/admin/profiles/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, verified })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message)
        fetchProfiles() // Refresh the list
      } else {
        toast.error(data.error || 'Failed to update verification status')
      }
    } catch (error) {
      console.error('Error updating verification:', error)
      toast.error('Failed to update verification status')
    }
  }

  const handleUpdateStatus = async (profileId: string, status: string) => {
    try {
      const response = await fetch('/api/admin/profiles/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, status })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message)
        fetchProfiles() // Refresh the list
      } else {
        toast.error(data.error || 'Failed to update profile status')
      }
    } catch (error) {
      console.error('Error updating profile status:', error)
      toast.error('Failed to update profile status')
    }
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Profile Management</h1>
          <p className="text-slate-600 mt-2">Manage user profiles and verifications</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => { setFilter('all'); setPage(1) }}
              >
                All Profiles
              </Button>
              <Button
                variant={filter === 'verified' ? 'default' : 'outline'}
                onClick={() => { setFilter('verified'); setPage(1) }}
              >
                Verified
              </Button>
              <Button
                variant={filter === 'unverified' ? 'default' : 'outline'}
                onClick={() => { setFilter('unverified'); setPage(1) }}
              >
                Unverified
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profiles List */}
        <Card>
          <CardHeader>
            <CardTitle>User Profiles</CardTitle>
            <CardDescription>
              {isLoading ? 'Loading...' : `${profiles.length} profiles found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-600">Loading profiles...</div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-8 text-slate-600">No profiles found</div>
            ) : (
              <div className="space-y-4">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4 flex-1">
                        {/* Profile Photo */}
                        <div className="w-16 h-16 bg-slate-200 rounded-full overflow-hidden flex-shrink-0">
                          {profile.profile_photo_url ? (
                            <img
                              src={profile.profile_photo_url}
                              alt={`${profile.first_name} ${profile.last_name}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-semibold">
                              {profile.first_name[0]}{profile.last_name[0]}
                            </div>
                          )}
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">
                              {profile.first_name} {profile.last_name}
                            </h3>
                            {profile.is_verified ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="w-3 h-3 mr-1" />
                                Unverified
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={
                                profile.profile_status === 'active'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }
                            >
                              {profile.profile_status}
                            </Badge>
                          </div>
                          <div className="text-sm text-slate-600 space-y-1">
                            <p>{profile.gender} • {profile.marital_status.replace('_', ' ')}</p>
                            <p>{profile.city}, {profile.state}</p>
                            <p className="text-xs">Created: {new Date(profile.created_at).toLocaleDateString()}</p>
                            {profile.verified_at && (
                              <p className="text-xs text-green-600">
                                Verified: {new Date(profile.verified_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/profile/${profile.user_id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {profile.is_verified ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerifyProfile(profile.id, false)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Unverify
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleVerifyProfile(profile.id, true)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Verify
                          </Button>
                        )}
                        {profile.profile_status === 'active' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(profile.id, 'inactive')}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <PowerOff className="w-4 h-4 mr-1" />
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(profile.id, 'active')}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Power className="w-4 h-4 mr-1" />
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
