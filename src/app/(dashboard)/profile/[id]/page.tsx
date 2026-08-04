'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BriefcaseBusiness,
  Calendar,
  GraduationCap,
  Heart,
  Home,
  MapPin,
  Pencil,
  Ruler,
  Sparkles,
  User,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/profile.types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SendInterestButton } from '@/components/interests/SendInterestButton'

export const dynamic = 'force-dynamic'

interface ProfileDetailProps {
  params: Promise<{ id: string }>
}

interface CurrentUserProfile {
  id: string
  user_id: string
}

interface DetailItem {
  label: string
  value?: string | number | null
}

function formatValue(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return 'Not specified'
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

function formatAge(dateOfBirth: string) {
  const birthDate = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }

  return age
}

function formatHeight(heightCm?: number | null) {
  if (!heightCm) return null

  const totalInches = Math.round(heightCm / 2.54)
  const feet = Math.floor(totalInches / 12)
  const inches = totalInches % 12

  return `${feet}'${inches}" / ${heightCm} cm`
}

function formatIncome(profile: Profile) {
  if (!profile.annual_income) return null

  return `${profile.income_currency || 'INR'} ${profile.annual_income.toLocaleString()}`
}

function initials(profile: Profile) {
  return `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
}

function DetailGrid({ items }: { items: DetailItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map(item => (
        <div key={item.label} className="min-w-0">
          <p className="text-sm text-slate-500">{item.label}</p>
          <p className="mt-1 break-words font-medium text-slate-900">
            {formatValue(item.value)}
          </p>
        </div>
      ))}
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-rose-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function ProfileDetailPage({ params }: ProfileDetailProps) {
  const router = useRouter()
  const supabase = createClient()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    params.then(({ id }) => setProfileId(id))
  }, [params])

  useEffect(() => {
    if (!profileId) return

    const loadProfile = async () => {
      setIsLoading(true)

      try {
        const [{ data: userData }, { data, error }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from('profiles').select('*').eq('id', profileId).single(),
        ])

        if (error) {
          console.error('Profile load error:', error)
          toast.error('Failed to load profile')
          setProfile(null)
          return
        }

        setProfile(data)

        if (userData.user) {
          const { data: ownProfile } = await supabase
            .from('profiles')
            .select('id, user_id')
            .eq('user_id', userData.user.id)
            .single()

          setCurrentUserProfile(ownProfile || null)
        }
      } catch (error) {
        console.error('Unexpected profile load error:', error)
        toast.error('Something went wrong')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [profileId, supabase])

  const isOwnProfile = currentUserProfile?.id === profile?.id

  const age = useMemo(() => {
    if (!profile?.date_of_birth) return null
    return formatAge(profile.date_of_birth)
  }, [profile?.date_of_birth])

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <Card>
          <CardContent className="py-12 text-center text-slate-600">
            Loading profile...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold text-slate-900">Profile not found</p>
            <Button variant="outline" onClick={() => router.push('/search')} className="mt-4">
              Back to Search
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-5">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-6">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-[4/5] bg-slate-100">
                {profile.profile_photo_url ? (
                  <Image
                    src={profile.profile_photo_url}
                    alt={`${profile.first_name} ${profile.last_name}`}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 360px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Avatar className="h-32 w-32">
                      <AvatarFallback className="text-4xl">{initials(profile)}</AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </div>

              <CardContent className="space-y-5 p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-950">
                      {profile.first_name} {profile.last_name}
                    </h1>
                    {profile.profile_status === 'active' && (
                      <Badge className="border-green-200 bg-green-50 text-green-700 hover:bg-green-50">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4" />
                    {profile.city}, {profile.state}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-md border border-slate-200 p-3">
                    <p className="text-lg font-bold text-slate-950">{age || '-'}</p>
                    <p className="text-xs text-slate-500">Years</p>
                  </div>
                  <div className="rounded-md border border-slate-200 p-3">
                    <p className="text-lg font-bold text-slate-950">{profile.height_cm || '-'}</p>
                    <p className="text-xs text-slate-500">Cm</p>
                  </div>
                  <div className="rounded-md border border-slate-200 p-3">
                    <p className="text-lg font-bold text-slate-950">
                      {profile.profile_completion_percentage || 0}%
                    </p>
                    <p className="text-xs text-slate-500">Complete</p>
                  </div>
                </div>

                {isOwnProfile ? (
                  <Button asChild className="w-full">
                    <Link href="/profile/edit">
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Link>
                  </Button>
                ) : (
                  <SendInterestButton receiverProfileId={profile.id} />
                )}
              </CardContent>
            </Card>

            <Section title="Quick Facts" icon={Sparkles}>
              <div className="space-y-3 text-sm">
                <p className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Marital Status</span>
                  <span className="text-right font-medium">{formatValue(profile.marital_status)}</span>
                </p>
                <p className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Mother Tongue</span>
                  <span className="text-right font-medium">{formatValue(profile.mother_tongue)}</span>
                </p>
                <p className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Religion</span>
                  <span className="text-right font-medium">{formatValue(profile.religion)}</span>
                </p>
                <p className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Caste</span>
                  <span className="text-right font-medium">{formatValue(profile.caste)}</span>
                </p>
              </div>
            </Section>
          </aside>

          <main className="space-y-6">
            {profile.about_me && (
              <Section title="About" icon={User}>
                <p className="whitespace-pre-wrap leading-7 text-slate-700">{profile.about_me}</p>
              </Section>
            )}

            <Section title="Basic Details" icon={Calendar}>
              <DetailGrid
                items={[
                  { label: 'Full Name', value: `${profile.first_name} ${profile.last_name}` },
                  { label: 'Age', value: age ? `${age} years` : null },
                  { label: 'Gender', value: profile.gender },
                  { label: 'Marital Status', value: profile.marital_status },
                  { label: 'Mother Tongue', value: profile.mother_tongue },
                  { label: 'Profile Status', value: profile.profile_status },
                ]}
              />
            </Section>

            <Section title="Physical Details" icon={Ruler}>
              <DetailGrid
                items={[
                  { label: 'Height', value: formatHeight(profile.height_cm) },
                  { label: 'Weight', value: profile.weight_kg ? `${profile.weight_kg} kg` : null },
                  { label: 'Complexion', value: profile.complexion },
                  { label: 'Blood Group', value: profile.blood_group },
                  { label: 'Disability', value: profile.disability },
                ]}
              />
            </Section>

            <Section title="Education & Career" icon={BriefcaseBusiness}>
              <DetailGrid
                items={[
                  { label: 'Education', value: profile.education },
                  { label: 'Occupation', value: profile.occupation },
                  { label: 'Company', value: profile.company_name },
                  { label: 'Employment Type', value: profile.employment_type },
                  { label: 'Work Location', value: profile.work_location },
                  { label: 'Annual Income', value: formatIncome(profile) },
                ]}
              />
            </Section>

            <Section title="Religion" icon={Heart}>
              <DetailGrid
                items={[
                  { label: 'Religion', value: profile.religion },
                  { label: 'Caste', value: profile.caste },
                  { label: 'Sub Caste', value: profile.sub_caste },
                  { label: 'Mother Tongue', value: profile.mother_tongue },
                ]}
              />
            </Section>

            <Section title="Location" icon={MapPin}>
              <DetailGrid
                items={[
                  { label: 'City', value: profile.city },
                  { label: 'State', value: profile.state },
                  { label: 'Country', value: profile.country },
                  { label: 'Work Location', value: profile.work_location },
                ]}
              />
            </Section>

            <Section title="Family" icon={Home}>
              <DetailGrid
                items={[
                  { label: "Father's Name", value: profile.father_name },
                  { label: "Father's Occupation", value: profile.father_occupation },
                  { label: "Mother's Name", value: profile.mother_name },
                  { label: "Mother's Occupation", value: profile.mother_occupation },
                  { label: 'Family Type', value: profile.family_type },
                  { label: 'Family Status', value: profile.family_status },
                  { label: 'Family Values', value: profile.family_values },
                ]}
              />
            </Section>

            <Section title="Siblings" icon={Users}>
              <DetailGrid
                items={[
                  { label: 'Total Siblings', value: profile.total_siblings },
                  { label: 'Brothers Married', value: profile.brothers_married },
                  { label: 'Brothers Unmarried', value: profile.brothers_unmarried },
                  { label: 'Sisters Married', value: profile.sisters_married },
                  { label: 'Sisters Unmarried', value: profile.sisters_unmarried },
                ]}
              />
            </Section>

            <Section title="Hobbies & Interests" icon={GraduationCap}>
              {profile.hobbies && profile.hobbies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.hobbies.map(hobby => (
                    <Badge key={hobby} variant="secondary" className="rounded-md px-3 py-1">
                      {hobby}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">Not specified</p>
              )}
            </Section>
          </main>
        </div>
      </div>
    </div>
  )
}
