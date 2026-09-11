import type { Metadata } from 'next'
import { CelebrationBreadcrumbs } from '@/components/celebrations/CelebrationBreadcrumbs'
import { CelebrationContactActions } from '@/components/celebrations/CelebrationContactActions'
import { businessContact, businessContactLinks } from '@/lib/business-contact'

export const metadata: Metadata = { title: 'Contact & Grievance Support | MyThirumanam', description: 'Contact MyThirumanam about celebration services, privacy requests, corrections, deletion requests or grievances.', robots: { index: true, follow: true } }

export default function ContactPage() {
  const hasContactDetails = businessContact.bookingsEmail || businessContactLinks.callHref || businessContactLinks.whatsappHref
  return <main className="min-h-screen bg-[#fffaf3] text-stone-900"><div className="mx-auto max-w-4xl px-4 sm:px-6"><CelebrationBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Contact & Grievance Support' }]} /><section className="py-12 sm:py-16"><h1 className="text-4xl font-bold">Contact &amp; Grievance Support</h1><p className="mt-5 max-w-3xl leading-8 text-stone-700">Contact MyThirumanam regarding celebration-service concerns, privacy requests, correction or deletion requests, and customer grievances.</p>{hasContactDetails ? <div className="mt-6 space-y-4 rounded-2xl border border-amber-200 bg-white p-5"><CelebrationContactActions tone="light" showPlan={false} />{businessContact.bookingsEmail && <p><a className="font-semibold text-amber-800 underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700" href={`mailto:${businessContact.bookingsEmail}`}>{businessContact.bookingsEmail}</a></p>}</div> : <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 leading-7 text-stone-700">Approved customer support, privacy and grievance contact information is required before production publication.</p>}</section></div></main>
}
