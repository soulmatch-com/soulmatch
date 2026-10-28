import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, MapPin, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createAdminClient } from '@/lib/supabase/admin'

interface AdminProfileDetailPageProps {
  params: Promise<{ id: string }>
}

function label(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return 'Not specified'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase())
}

function dateLabel(value: string | null | undefined) {
  if (!value) return 'Not specified'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}

function DetailList({ items }: { items: Array<[string, string | number | null | undefined]> }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {items.map(([term, value]) => (
        <div key={term}>
          <dt className="text-sm text-slate-500">{term}</dt>
          <dd className="mt-1 break-words font-medium text-slate-900">{label(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

export default async function AdminProfileDetailPage({ params }: AdminProfileDetailPageProps) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()

  if (error) throw new Error(`Unable to load profile: ${error.message}`)
  if (!profile) notFound()

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <Button asChild variant="ghost" className="mb-5">
        <Link href="/admin/profiles"><ArrowLeft className="mr-2 h-4 w-4" />Back to Profiles</Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit">
          <CardContent className="p-6">
            <div className="flex h-48 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
              {profile.profile_photo_url ? (
                // Profile-photo URLs are admin-managed remote URLs and may use multiple hosts.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.profile_photo_url} alt={`${profile.first_name} ${profile.last_name}`} className="h-full w-full object-cover" />
              ) : (
                <span className="text-5xl font-semibold text-slate-400">{profile.first_name?.[0]}{profile.last_name?.[0]}</span>
              )}
            </div>
            <h1 className="mt-5 text-2xl font-bold text-slate-950">{profile.first_name} {profile.last_name}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4" />{profile.city}, {profile.state}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={profile.is_verified ? 'default' : 'secondary'} className={profile.is_verified ? 'bg-green-600' : ''}>
                {profile.is_verified ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <XCircle className="mr-1 h-3.5 w-3.5" />}
                {profile.is_verified ? 'Verified' : 'Unverified'}
              </Badge>
              <Badge variant="outline">{label(profile.profile_status)}</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Profile details</CardTitle></CardHeader>
            <CardContent><DetailList items={[
              ['Date of birth', dateLabel(profile.date_of_birth)], ['Gender', profile.gender],
              ['Marital status', profile.marital_status], ['Religion', profile.religion],
              ['Caste', profile.caste], ['Sub caste', profile.sub_caste],
              ['Mother tongue', profile.mother_tongue], ['Height', profile.height_cm ? `${profile.height_cm} cm` : null],
              ['Profile completion', `${profile.profile_completion_percentage || 0}%`], ['Registered', dateLabel(profile.created_at)],
            ]} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Education & career</CardTitle></CardHeader>
            <CardContent><DetailList items={[
              ['Education', profile.education], ['Occupation', profile.occupation], ['Company', profile.company_name],
              ['Employment type', profile.employment_type], ['Work location', profile.work_location],
              ['Annual income', profile.annual_income ? `${profile.income_currency || 'INR'} ${profile.annual_income.toLocaleString()}` : null],
            ]} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>About & family</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <p className="whitespace-pre-wrap text-slate-700">{profile.about_me || 'No introduction provided.'}</p>
              <DetailList items={[
                ['Father', profile.father_name], ['Father’s occupation', profile.father_occupation],
                ['Mother', profile.mother_name], ['Mother’s occupation', profile.mother_occupation],
                ['Family type', profile.family_type], ['Family values', profile.family_values],
              ]} />
              {profile.hobbies?.length ? <div><p className="mb-2 text-sm text-slate-500">Hobbies</p><div className="flex flex-wrap gap-2">{profile.hobbies.map((hobby: string) => <Badge key={hobby} variant="secondary">{hobby}</Badge>)}</div></div> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
