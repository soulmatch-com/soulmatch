'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { CelebrationEnquiryFormValues } from '@/lib/validations/celebration-enquiry-api.schema'
import { getCelebrationServicePresentation, type PublicCelebrationService } from '@/lib/celebrations/service-query'

const guestLabels = { 'below-20': 'Below 20', '20-50': '20–50', '51-100': '51–100', '100-plus': '100+' }
const arrangementLabels = { 'ceremony-only': 'Ceremony Only', 'ceremony-food': 'Ceremony + Food', 'ceremony-stay': 'Ceremony + Stay', 'complete-arrangement': 'Complete Arrangement', 'need-guidance': 'Need Guidance' }
const contactLabels = { phone: 'Phone', whatsapp: 'WhatsApp', email: 'Email' }
type Ceremony = { title: string; tamil: string } | undefined

function dateLabel(value?: string) {
  if (!value) return 'Not provided'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function SummaryRows({ rows }: { rows: Array<[string, string | undefined]> }) {
  return <dl className="mt-4 grid gap-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-sm text-stone-600">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium">{value || 'Not provided'}</dd></div>)}</dl>
}

export function EnquiryReview({ values, services, ceremony, onEdit, disabled }: { values: CelebrationEnquiryFormValues; services: PublicCelebrationService[]; ceremony: Ceremony; onEdit(step: number): void; disabled: boolean }) {
  const selected = services.filter((service) => values.serviceIds.includes(service.id))
  const sections = [
    { title: 'Ceremony', content: <><p className="mt-4 font-medium">{ceremony?.title}</p><p lang="ta" className="mt-2 leading-7 text-stone-600">{ceremony?.tamil}</p></> },
    { title: 'Couple details', content: <SummaryRows rows={[
      ['Husband Name', values.husbandName], ['Wife Name', values.wifeName],
      ['Husband Date of Birth', dateLabel(values.husbandDob)], ['Wife Date of Birth', dateLabel(values.wifeDob)],
      ...([['Husband Nakshatra', values.husbandNakshatra], ['Wife Nakshatra', values.wifeNakshatra], ['Husband Rasi', values.husbandRasi], ['Wife Rasi', values.wifeRasi]] as Array<[string, string | undefined]>).filter(([, value]) => value?.trim()),
    ]} /> },
    { title: 'Event details', content: <SummaryRows rows={[
      ['Preferred Ceremony Date', dateLabel(values.preferredDate)], ['Alternative Date', dateLabel(values.alternativeDate)],
      ['Number of Guests', guestLabels[values.guestCountRange]], ['Travelling From', values.travellingFrom],
      ['Arrangement Preference', arrangementLabels[values.arrangementPreference]],
    ]} /> },
    { title: 'Services', content: <><p className="mt-4 font-medium">{selected.length} {selected.length === 1 ? 'service' : 'services'} selected</p>{selected.length > 0 ? <ul className="mt-3 list-disc space-y-2 pl-5">{selected.map((service) => <li key={service.id}>{getCelebrationServicePresentation(service).name}</li>)}</ul> : <p className="mt-2 text-stone-600">Guidance requested for service selection.</p>}{values.otherServiceDetails?.trim() && <SummaryRows rows={[[ 'Additional service requirement', values.otherServiceDetails ]]} />}</> },
    { title: 'Contact', content: <SummaryRows rows={[
      ['Contact Person Name', values.contactName], ['Mobile Number', values.mobile],
      ...(values.email?.trim() ? [['Email', values.email] as [string, string]] : []),
      ['Relationship to Couple', values.relationship], ['Preferred Contact Method', contactLabels[values.preferredContactMethod]],
      ...(values.notes?.trim() ? [['Additional Notes', values.notes] as [string, string]] : []),
    ]} /> },
  ]
  return <section aria-labelledby="review-heading"><h3 id="review-heading" className="text-2xl font-bold">Review your planning request</h3><p className="mt-2 leading-7 text-stone-600">Check your details before sending. You can edit any section.</p><div className="mt-6 space-y-5">{sections.map((section, index) => <section key={section.title} aria-labelledby={`review-section-${index}`} className="rounded-2xl border border-amber-200 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><h4 id={`review-section-${index}`} className="text-lg font-bold">{section.title}</h4><Button type="button" variant="outline" disabled={disabled} aria-label={`Edit ${section.title}`} onClick={() => onEdit(index)} className="min-h-12">Edit</Button></div>{section.content}</section>)}</div></section>
}

export function EnquiryConfirmation({ enquiryReference, values, ceremony }: { enquiryReference: string; values: CelebrationEnquiryFormValues; ceremony: Ceremony }) {
  const [copyMessage, setCopyMessage] = useState('')
  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(enquiryReference)
      setCopyMessage('Reference copied')
    } catch {
      setCopyMessage('Could not copy automatically. Please select and copy the reference above.')
    }
  }
  return <section aria-labelledby="enquiry-success-title" className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-lg sm:p-10">
    <h2 id="enquiry-success-title" tabIndex={-1} className="scroll-mt-28 text-3xl font-bold focus:outline-none">Planning request submitted</h2>
    <p className="mt-4 text-stone-600">Your Thirukadaiyur celebration planning request has been received.</p>
    <p className="mt-6 text-sm text-stone-600">Enquiry Reference:</p><p className="mt-1 select-all break-all font-mono font-semibold">{enquiryReference}</p>
    <Button type="button" variant="outline" onClick={copyReference} className="mt-3 min-h-12">Copy reference</Button><p role="status" className="mt-2 text-sm text-stone-700">{copyMessage}</p>
    <SummaryRows rows={[[ 'Celebration', ceremony?.title ], ['Preferred Ceremony Date', dateLabel(values.preferredDate)], ['Selected services', String(values.serviceIds.length)], ['Preferred Contact Method', contactLabels[values.preferredContactMethod]]]} />
    <h3 className="mt-7 text-xl font-bold">What happens next?</h3><p className="mt-2 leading-7 text-stone-600">Our team will review the planning request and use the contact details you provided to discuss the next steps.</p>
    <Link href="/" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-800 px-6 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-800">Back to Thirukadaiyur Celebrations</Link>
  </section>
}
