'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import Image from 'next/image'
import { ArrowLeft, Heart, X } from 'lucide-react'

interface ProfileDetailProps {
  params: {
    id: string
  }
}

export default function ProfileDetailPage({ params }: ProfileDetailProps) {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [params.id])

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) {
        console.error('Profile load error:', error)
        toast.error('Failed to load profile')
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const handleInterest = async () => {
    toast.info('Interest feature coming soon!')
    // TODO: Implement interest/like functionality
  }

  const handleSkip = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4">
        <Card>
          <CardContent className="py-10 text-center">
            <p>Loading profile...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4">
        <Card>
          <CardContent className="py-10 text-center">
            <p>Profile not found</p>
            <Button variant="outline" onClick={() => router.push('/search')} className="mt-4">
              Back to Search
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Profile Photo */}
              <div className="flex-shrink-0 mx-auto md:mx-0">
                {profile.profile_photo_url ? (
                  <div className="relative w-48 h-48 rounded-lg overflow-hidden border-4 border-slate-200">
                    <Image
                      src={profile.profile_photo_url}
                      alt={`${profile.first_name} ${profile.last_name}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <Avatar className="w-48 h-48">
                    <AvatarFallback className="text-5xl">
                      {profile.first_name[0]}{profile.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">
                  {profile.first_name} {profile.last_name}
                </h1>
                <p className="text-xl text-slate-600 mb-4">
                  {calculateAge(profile.date_of_birth)} years old
                </p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Location</p>
                    <p className="font-medium">{profile.city}, {profile.state}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Marital Status</p>
                    <p className="font-medium capitalize">{profile.marital_status?.replace('_', ' ')}</p>
                  </div>
                  {profile.height_cm && (
                    <div>
                      <p className="text-slate-600">Height</p>
                      <p className="font-medium">{profile.height_cm} cm ({Math.floor(profile.height_cm / 30.48)}''{Math.round((profile.height_cm % 30.48) / 2.54)}\")</p>
                    </div>
                  )}
                  {profile.weight_kg && (
                    <div>
                      <p className="text-slate-600">Weight</p>
                      <p className="font-medium">{profile.weight_kg} kg</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mt-6">
                  <Button onClick={handleInterest} className="flex-1">
                    <Heart className="w-4 h-4 mr-2" />
                    Express Interest
                  </Button>
                  <Button variant="outline" onClick={handleSkip}>
                    <X className="w-4 h-4 mr-2" />
                    Skip
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Me */}
        {profile.about_me && (
          <Card>
            <CardHeader>
              <CardTitle>About Me</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 whitespace-pre-wrap">{profile.about_me}</p>
            </CardContent>
          </Card>
        )}

        {/* Professional Information */}
        {(profile.education || profile.occupation || profile.company_name || profile.annual_income) && (
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.education && (
                  <div>
                    <p className="text-slate-600 text-sm">Education</p>
                    <p className="font-medium">{profile.education}</p>
                  </div>
                )}
                {profile.occupation && (
                  <div>
                    <p className="text-slate-600 text-sm">Occupation</p>
                    <p className="font-medium">{profile.occupation}</p>
                  </div>
                )}
                {profile.company_name && (
                  <div>
                    <p className="text-slate-600 text-sm">Company</p>
                    <p className="font-medium">{profile.company_name}</p>
                  </div>
                )}
                {profile.annual_income && (
                  <div>
                    <p className="text-slate-600 text-sm">Annual Income</p>
                    <p className="font-medium">
                      {profile.income_currency || 'INR'} {profile.annual_income.toLocaleString()}
                    </p>
                  </div>
                )}
                {profile.employment_type && (
                  <div>
                    <p className="text-slate-600 text-sm">Employment Type</p>
                    <p className="font-medium capitalize">{profile.employment_type.replace('_', ' ')}</p>
                  </div>
                )}
                {profile.work_location && (
                  <div>
                    <p className="text-slate-600 text-sm">Work Location</p>
                    <p className="font-medium">{profile.work_location}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cultural & Personal Details */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.religion && (
                <div>
                  <p className="text-slate-600 text-sm">Religion</p>
                  <p className="font-medium">{profile.religion}</p>
                </div>
              )}
              {profile.caste && (
                <div>
                  <p className="text-slate-600 text-sm">Caste</p>
                  <p className="font-medium">{profile.caste}</p>
                </div>
              )}
              {profile.mother_tongue && (
                <div>
                  <p className="text-slate-600 text-sm">Mother Tongue</p>
                  <p className="font-medium">{profile.mother_tongue}</p>
                </div>
              )}
              {profile.complexion && (
                <div>
                  <p className="text-slate-600 text-sm">Complexion</p>
                  <p className="font-medium capitalize">{profile.complexion.replace('_', ' ')}</p>
                </div>
              )}
              {profile.blood_group && (
                <div>
                  <p className="text-slate-600 text-sm">Blood Group</p>
                  <p className="font-medium">{profile.blood_group}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Family Information */}
        {(profile.father_name || profile.mother_name || profile.family_type) && (
          <Card>
            <CardHeader>
              <CardTitle>Family Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.father_name && (
                  <div>
                    <p className="text-slate-600 text-sm">Father's Name</p>
                    <p className="font-medium">{profile.father_name}</p>
                  </div>
                )}
                {profile.father_occupation && (
                  <div>
                    <p className="text-slate-600 text-sm">Father's Occupation</p>
                    <p className="font-medium">{profile.father_occupation}</p>
                  </div>
                )}
                {profile.mother_name && (
                  <div>
                    <p className="text-slate-600 text-sm">Mother's Name</p>
                    <p className="font-medium">{profile.mother_name}</p>
                  </div>
                )}
                {profile.mother_occupation && (
                  <div>
                    <p className="text-slate-600 text-sm">Mother's Occupation</p>
                    <p className="font-medium">{profile.mother_occupation}</p>
                  </div>
                )}
                {profile.family_type && (
                  <div>
                    <p className="text-slate-600 text-sm">Family Type</p>
                    <p className="font-medium capitalize">{profile.family_type}</p>
                  </div>
                )}
                {profile.family_status && (
                  <div>
                    <p className="text-slate-600 text-sm">Family Status</p>
                    <p className="font-medium capitalize">{profile.family_status.replace('_', ' ')}</p>
                  </div>
                )}
                {profile.family_values && (
                  <div>
                    <p className="text-slate-600 text-sm">Family Values</p>
                    <p className="font-medium capitalize">{profile.family_values}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Siblings Information */}
        {profile.total_siblings > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Siblings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{profile.total_siblings}</p>
                  <p className="text-sm text-slate-600">Total Siblings</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.brothers_married || 0}</p>
                  <p className="text-sm text-slate-600">Brothers (Married)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.brothers_unmarried || 0}</p>
                  <p className="text-sm text-slate-600">Brothers (Unmarried)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{(profile.sisters_married || 0) + (profile.sisters_unmarried || 0)}</p>
                  <p className="text-sm text-slate-600">Sisters</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hobbies */}
        {profile.hobbies && profile.hobbies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Hobbies & Interests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.hobbies.map((hobby: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
                  >
                    {hobby}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
