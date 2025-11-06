'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import Image from 'next/image'
import { ArrowLeft, Heart, X, Edit } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface ProfileDetailProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

interface Profile {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  city: string
  state: string
  marital_status?: string
  height_cm?: number
  weight_kg?: number
  profile_photo_url?: string
  about_me?: string
  education?: string
  occupation?: string
  company_name?: string
  annual_income?: number
  income_currency?: string
  employment_type?: string
  work_location?: string
  religion?: string
  caste?: string
  mother_tongue?: string
  complexion?: string
  blood_group?: string
  father_name?: string
  father_occupation?: string
  mother_name?: string
  mother_occupation?: string
  family_type?: string
  family_status?: string
  family_values?: string
  total_siblings?: number
  brothers_married?: number
  brothers_unmarried?: number
  sisters_married?: number
  sisters_unmarried?: number
  hobbies?: string[]
  // New Basic Details fields
  profile_created_for?: string
  body_type?: string
  physical_status?: string
  drinking_habits?: string
  smoking_habits?: string
  eating_habits?: string
  // New Religion Information fields
  sub_caste?: string
  gothram?: string
  star?: string
  raasi?: string
  dosham?: string
  // New Location fields
  country?: string
  citizenship?: string
  ancestral_origin?: string
}

export default function ProfileDetailPage({ params }: ProfileDetailProps) {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [profileId, setProfileId] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ id }) => setProfileId(id))
  }, [params])

  useEffect(() => {
    if (profileId) {
      loadProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  const loadProfile = async () => {
    if (!profileId) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
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
      <div className="container max-w-7xl mx-auto py-10 px-4">
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
      <div className="container max-w-7xl mx-auto py-10 px-4">
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
    <div className="container max-w-7xl mx-auto py-10 px-4">
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
                      <p className="font-medium">{profile.height_cm} cm ({Math.floor(Number(profile.height_cm) / 30.48)}&apos;&apos;{Math.round((Number(profile.height_cm) % 30.48) / 2.54)}&quot;)</p>
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

        {/* Basic Details */}
        <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">Basic Details</CardTitle>
            <Link href="/profile/edit">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Profile created for</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {profile.profile_created_for || (
                      <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                        Add Profile Type ▸
                      </Link>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Body Type</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {profile.body_type || (
                      <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                        Add Body Type ▸
                      </Link>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Physical Status</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {profile.physical_status || 'Normal'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Weight</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {profile.weight_kg ? `${profile.weight_kg} kg` : (
                      <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                        Add Weight ▸
                      </Link>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Marital Status</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                    {profile.marital_status?.replace('_', ' ') || 'Not specified'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Drinking Habits</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {profile.drinking_habits || (
                      <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                        Add Drinking Habits ▸
                      </Link>
                    )}
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Name</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {profile.first_name} {profile.last_name}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Age</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {calculateAge(profile.date_of_birth)} Years
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Height</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {profile.height_cm ? (
                      `${Math.floor(Number(profile.height_cm) / 30.48)} Ft ${Math.round((Number(profile.height_cm) % 30.48) / 2.54)} In / ${profile.height_cm} Cms`
                    ) : (
                      <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                        Add Height ▸
                      </Link>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Mother Tongue</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {profile.mother_tongue || (
                      <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                        Add Mother Tongue ▸
                      </Link>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Eating Habits</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {profile.eating_habits || (
                      <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                        Add Eating Habits ▸
                      </Link>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Smoking Habits</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {profile.smoking_habits || (
                      <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                        Add Smoking Habits ▸
                      </Link>
                    )}
                  </p>
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

        {/* Religion Information */}
        <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">Religion Information</CardTitle>
            <Link href="/profile/edit">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Religion</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {profile.religion || (
                    <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                      Add Religion ▸
                    </Link>
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Caste / Sub Caste</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {profile.caste ? `${profile.caste} - ${profile.sub_caste || 'Not Specified'}` : (
                    <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                      Add Caste ▸
                    </Link>
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Gothram</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {profile.gothram || '-'}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Star / Raasi</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {profile.star && profile.raasi
                    ? `${profile.star} / ${profile.raasi}`
                    : profile.star || profile.raasi || (
                      <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                        Add Star / Raasi ▸
                      </Link>
                    )}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Dosham</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {profile.dosham || (
                    <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                      Add Dosham Status ▸
                    </Link>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Physical & Other Details */}
        {(profile.complexion || profile.blood_group) && (
          <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-semibold">Physical Details</CardTitle>
              <Link href="/profile/edit">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {profile.complexion && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Complexion</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                      {profile.complexion.replace('_', ' ')}
                    </p>
                  </div>
                )}
                {profile.blood_group && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Blood Group</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {profile.blood_group}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Groom's/Bride's Location */}
        <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">Groom&apos;s Location</CardTitle>
            <Link href="/profile/edit">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Country</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {profile.country || (
                      <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                        Add Country ▸
                      </Link>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">State</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {profile.state || (
                      <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                        Add State ▸
                      </Link>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Ancestral Origin</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {profile.ancestral_origin || 'Not Specified'}
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">City</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {profile.city || (
                      <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                        Add City ▸
                      </Link>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Citizenship</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {profile.citizenship || (
                      <Link href="/profile/edit" className="text-blue-600 hover:text-blue-700">
                        Add Citizenship ▸
                      </Link>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Family Information */}
        {(profile.father_name || profile.mother_name || profile.family_type) && (
          <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-semibold">Family Information</CardTitle>
              <Link href="/profile/edit">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </Link>
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
        {profile.total_siblings && profile.total_siblings > 0 && (
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
