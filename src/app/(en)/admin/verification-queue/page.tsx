'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminStore } from '@/modules/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Eye, Clock } from 'lucide-react'

interface Profile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  gender: string
  marital_status: string
  city: string
  state: string
  date_of_birth: string
  profile_status: string
  is_verified: boolean
  verified_at: string | null
  created_at: string
  profile_photo_url: string | null
}

export default function VerificationQueuePage() {
  const { clearAdmin } = useAdminStore()
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPendingProfiles()
  }, [])

  const fetchPendingProfiles = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/profiles?verified=false&limit=50')
      const data = await response.json()

      if (response.ok) {
        setProfiles(data.profiles || [])
      } else if (response.status === 401 || response.status === 403) {
        clearAdmin()
        router.replace('/admin/login')
      } else {
        toast.error(data.error || 'Failed to fetch profiles')
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
      toast.error('Failed to load verification queue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyProfile = async (profileId: string) => {
    try {
      const response = await fetch('/api/admin/profiles/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, verified: true })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Profile verified successfully')
        fetchPendingProfiles() // Refresh the list
      } else {
        toast.error(data.error || 'Failed to verify profile')
      }
    } catch (error) {
      console.error('Error verifying profile:', error)
      toast.error('Failed to verify profile')
    }
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-slate-900">Profile Verification Queue</h1>
          </div>
          <p className="text-slate-600">Review and verify pending user profiles</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Pending Verification</span>
              <Badge variant="secondary" className="text-base">
                {profiles.length} profiles
              </Badge>
            </CardTitle>
            <CardDescription>
              {isLoading ? 'Loading...' : `${profiles.length} profiles waiting for verification`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-slate-600">
                <Clock className="w-12 h-12 mx-auto mb-4 animate-spin text-slate-400" />
                Loading verification queue...
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">All caught up!</h3>
                <p className="text-slate-600">There are no profiles pending verification at this time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="border rounded-lg p-6 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex gap-6 flex-1">
                        {/* Profile Photo */}
                        <div className="w-20 h-20 bg-slate-200 rounded-full overflow-hidden flex-shrink-0">
                          {profile.profile_photo_url ? (
                            <img
                              src={profile.profile_photo_url}
                              alt={`${profile.first_name} ${profile.last_name}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-semibold text-2xl">
                              {profile.first_name[0]}{profile.last_name[0]}
                            </div>
                          )}
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold text-slate-900">
                              {profile.first_name} {profile.last_name}
                            </h3>
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                            <div>
                              <span className="text-slate-500">Age:</span>
                              <span className="ml-2 font-medium text-slate-900">
                                {calculateAge(profile.date_of_birth)} years
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Gender:</span>
                              <span className="ml-2 font-medium text-slate-900 capitalize">
                                {profile.gender}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Marital Status:</span>
                              <span className="ml-2 font-medium text-slate-900 capitalize">
                                {profile.marital_status.replace('_', ' ')}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Location:</span>
                              <span className="ml-2 font-medium text-slate-900">
                                {profile.city}, {profile.state}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 text-xs text-slate-500">
                            Registered: {new Date(profile.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
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
                          <Eye className="w-4 h-4 mr-2" />
                          View Full Profile
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleVerifyProfile(profile.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Verify Profile
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
