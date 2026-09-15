import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CelebrationEnquiryStatusForm } from '@/components/admin/CelebrationEnquiryStatusForm'
import { requireActiveAdmin } from '@/lib/admin-auth'
import {
  CelebrationEnquiryDetailError,
  getArrangementPreferenceLabel,
  getCelebrationEnquiryDetail,
  getCeremonyDurationLabel,
  getContactMethodLabel,
  getHistoryChangedByLabel,
  getHistoryTransitionLabel,
  getStatusLabel,
} from '@/lib/celebrations/admin-enquiry-detail'
import { formatIndiaDateOnly, formatIndiaDateTime, getCelebrationLabel, getGuestLabel, getPlanLabel } from '@/lib/celebrations/admin-enquiries-core'
import { cn } from '@/lib/utils'

const statusBadgeClass = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  contacted: 'bg-blue-100 text-blue-800 border-blue-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium text-slate-900">{value || '-'}</dd></div>
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle className="text-xl">{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>
}

export default async function CelebrationEnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) redirect('/admin/login')

  let result
  try {
    result = await getCelebrationEnquiryDetail(id)
  } catch (error) {
    if (error instanceof CelebrationEnquiryDetailError && error.code === 'UNAUTHORIZED') redirect('/admin/login')
    if (error instanceof CelebrationEnquiryDetailError && error.code === 'NOT_FOUND') notFound()
    return <div className="container mx-auto px-4 py-10"><div className="mx-auto max-w-5xl"><h1 className="text-3xl font-bold text-slate-900">Celebration Enquiry</h1><p className="mt-2 text-slate-600">Unable to load this celebration enquiry right now.</p></div></div>
  }

  const { enquiry, services, history } = result
  const statusClass = enquiry.status ? statusBadgeClass[enquiry.status] : 'bg-slate-100 text-slate-700 border-slate-200'

  return (
    <div className="container mx-auto px-4 py-10"><div className="mx-auto max-w-5xl space-y-6">
      <Link href="/admin/celebration-enquiries" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3')}><ArrowLeft className="h-4 w-4" /> Back to Enquiries</Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-3xl font-bold text-slate-900">Celebration Enquiry</h1><p className="mt-2 text-lg font-medium text-slate-700">{enquiry.enquiry_reference ?? '-'}</p></div><Badge variant="outline" className={cn('w-fit text-sm', statusClass)}>{getStatusLabel(enquiry.status)}</Badge></div>
      <Card><CardContent className="pt-6"><dl className="grid gap-5 sm:grid-cols-3"><DetailItem label="Enquiry Reference" value={enquiry.enquiry_reference ?? '-'} /><DetailItem label="Submitted" value={formatIndiaDateTime(enquiry.created_at)} /><DetailItem label="Preferred Event Date" value={formatIndiaDateOnly(enquiry.preferred_date)} /></dl></CardContent></Card>

      <DetailSection title="Celebration Details"><dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><DetailItem label="Celebration Type" value={getCelebrationLabel(enquiry.celebration_type)} /><DetailItem label="Preferred Date" value={formatIndiaDateOnly(enquiry.preferred_date)} />{enquiry.alternative_date && <DetailItem label="Alternative Date" value={formatIndiaDateOnly(enquiry.alternative_date)} />}{enquiry.travelling_from && <DetailItem label="Travelling From" value={enquiry.travelling_from} />}<DetailItem label="Expected Guests" value={getGuestLabel(enquiry)} /><DetailItem label="Arrangement Preference" value={getArrangementPreferenceLabel(enquiry.arrangement_preference)} /></dl></DetailSection>
      <DetailSection title="Plan and Services"><dl className="grid gap-5 sm:grid-cols-2"><DetailItem label="Plan" value={getPlanLabel(enquiry.plan_type)} /><DetailItem label="Session" value={getCeremonyDurationLabel(enquiry.ceremony_duration)} /></dl><div className="mt-6 border-t border-slate-200 pt-5"><h3 className="font-medium text-slate-900">Selected Services</h3>{services.length > 0 ? <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected services">{services.map((service) => <li key={service.id} className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{service.name}</li>)}</ul> : <p className="mt-2 text-sm text-slate-600">No selected services recorded.</p>}</div></DetailSection>
      <DetailSection title="Couple Details"><dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><DetailItem label="Husband Name" value={enquiry.husband_name} /><DetailItem label="Wife Name" value={enquiry.wife_name} /><DetailItem label="Husband DOB" value={formatIndiaDateOnly(enquiry.husband_dob)} /><DetailItem label="Wife DOB" value={formatIndiaDateOnly(enquiry.wife_dob)} />{enquiry.husband_nakshatra && <DetailItem label="Husband Nakshatra" value={enquiry.husband_nakshatra} />}{enquiry.wife_nakshatra && <DetailItem label="Wife Nakshatra" value={enquiry.wife_nakshatra} />}{enquiry.husband_rasi && <DetailItem label="Husband Rasi" value={enquiry.husband_rasi} />}{enquiry.wife_rasi && <DetailItem label="Wife Rasi" value={enquiry.wife_rasi} />}</dl></DetailSection>
      <DetailSection title="Contact Details"><dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><DetailItem label="Contact Name" value={enquiry.contact_name} /><DetailItem label="Mobile" value={enquiry.mobile} />{enquiry.email && <DetailItem label="Email" value={enquiry.email} />}{enquiry.relationship && <DetailItem label="Relationship" value={enquiry.relationship} />}<DetailItem label="Preferred Contact Method" value={getContactMethodLabel(enquiry.preferred_contact_method)} /></dl></DetailSection>
      {(enquiry.special_requirements || enquiry.notes || enquiry.other_service_details) && <DetailSection title="Additional Requirements"><dl className="space-y-5">{enquiry.special_requirements && <DetailItem label="Special Requirements" value={<span className="whitespace-pre-wrap font-normal">{enquiry.special_requirements}</span>} />}{enquiry.notes && <DetailItem label="Notes" value={<span className="whitespace-pre-wrap font-normal">{enquiry.notes}</span>} />}{enquiry.other_service_details && <DetailItem label="Other Service Details" value={<span className="whitespace-pre-wrap font-normal">{enquiry.other_service_details}</span>} />}</dl></DetailSection>}
      <Card><CardHeader><CardTitle className="text-xl">Status Management</CardTitle><CardDescription>Each status change requires a remark and is recorded in the audit history.</CardDescription></CardHeader><CardContent><CelebrationEnquiryStatusForm enquiryId={enquiry.id} currentStatus={enquiry.status} /></CardContent></Card>
      <DetailSection title="Status History">{history.length === 0 ? <p className="text-slate-600">No status history recorded yet.</p> : <ol className="divide-y divide-slate-200" aria-label="Status history">{history.map((entry) => <li key={entry.id} className="py-5 first:pt-0 last:pb-0"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><h3 className="font-semibold text-slate-900">{getHistoryTransitionLabel(entry)}</h3><time className="text-sm text-slate-500">{formatIndiaDateTime(entry.changed_at)}</time></div><p className="mt-3 whitespace-pre-wrap text-slate-700">{entry.remarks}</p><p className="mt-3 text-sm text-slate-500">Changed by: {getHistoryChangedByLabel(entry)}</p></li>)}</ol>}</DetailSection>
    </div></div>
  )
}
