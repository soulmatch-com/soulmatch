import type { Metadata } from 'next'
import Link from 'next/link'
import { CelebrationBreadcrumbs } from '@/components/celebrations/CelebrationBreadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { IndependentServiceNotice } from '@/components/celebrations/IndependentServiceNotice'

const url = 'https://mythirumanam.in/terms'
const title = 'Terms & Conditions | MyThirumanam'
const description = 'Read the terms governing MyThirumanam celebration planning enquiries, service arrangements, third-party services and booking confirmations.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  robots: { index: true, follow: true },
  openGraph: { title, description, url, siteName: 'MyThirumanam', type: 'website' },
}

const terms = [
  {
    title: 'Nature of Service',
    text: 'MyThirumanam provides private event coordination and related assistance services for family celebrations and associated arrangements.',
  },
  {
    title: 'Enquiry Is Not a Booking',
    text: 'Submission of a planning enquiry through MyThirumanam does not constitute a confirmed booking. Availability and requirements must first be reviewed and confirmed.',
  },
  {
    title: 'Booking Confirmation',
    text: 'A booking will be considered confirmed only after the applicable services, availability and commercial terms have been agreed, any required advance payment has been received, and written confirmation has been issued by MyThirumanam.',
  },
  {
    title: 'Service Availability',
    text: 'Booking confirmation is subject to the availability of the selected services, vendors, facilities and other required arrangements.',
  },
  {
    title: 'Temple-Related Arrangements',
    text: 'Temple-related ceremonies, permissions, timings and facilities are subject to the rules, availability and decisions of the concerned temple authorities.',
  },
  {
    title: 'Additional Fees and Charges',
    text: 'Any official temple fee, government fee or third-party charge that is not expressly included in the confirmed quotation or service arrangement shall be payable separately.',
  },
  {
    title: 'Service Inclusions and Exclusions',
    text: 'The services, inclusions, exclusions and applicable charges will be communicated to the customer before booking confirmation.',
  },
  {
    title: 'Third-Party Services',
    text: "Hotel, catering, transportation, photography, videography and other third-party services are subject to availability and may also be governed by the respective service provider's terms and conditions.",
  },
  {
    title: 'Customer Information',
    text: 'Customers are responsible for providing accurate and complete information reasonably required to arrange the requested services. Changes or incorrect information may affect availability, scheduling or service arrangements.',
  },
  {
    title: 'Events Beyond Reasonable Control',
    text: 'MyThirumanam shall not be responsible for delays, cancellations or changes caused by circumstances beyond its reasonable control, including changes in temple schedules, government restrictions, natural events or disruptions involving third-party service providers.',
  },
  {
    title: 'Applicable Law and Disputes',
    text: 'Any dispute shall be handled in accordance with applicable laws of India and the jurisdiction specified in the final customer agreement.',
  },
] as const

export default function TermsPage() {
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Terms & Conditions', url, description }} />
      <main className="min-h-screen bg-[#fffaf3] text-stone-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <CelebrationBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Terms & Conditions' }]} />
        </div>

        <section className="mx-auto max-w-4xl px-4 pt-4 sm:px-6">
          <h2 className="text-xl font-semibold text-stone-900">Temple Independence</h2>
          <div className="mt-4 space-y-3"><IndependentServiceNotice variant="full" /><IndependentServiceNotice locale="ta" variant="full" /></div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20">
          <div className="rounded-3xl border border-amber-200 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Legal information</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Terms & Conditions</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-stone-700 sm:text-lg sm:leading-8">
              These Terms & Conditions apply to celebration planning and related services offered through MyThirumanam.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-7 text-stone-700">
              The /plan flow creates a planning enquiry. It is not an online booking confirmation, and submitting the enquiry does not reserve vendors, temple facilities or ceremony arrangements.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-7 text-stone-700">
              Any confirmed booking will follow the agreed service arrangement, availability review and written confirmation issued by MyThirumanam.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-7 text-stone-700">Read our <Link href="/privacy" className="font-semibold text-amber-800 underline">Privacy Policy</Link> to understand how celebration information is handled.</p>
          </div>

          <section aria-labelledby="terms-section-heading" className="mt-10">
            <h2 id="terms-section-heading" className="text-xl font-semibold text-stone-900">
              Terms
            </h2>
            <ol className="mt-6 space-y-4">
              {terms.map((term, index) => (
                <li key={term.title} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
                  <article>
                    <div className="flex items-start gap-4">
                      <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-900">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-stone-900">{term.title}</h3>
                        <p className="mt-2 leading-7 text-stone-700">{term.text}</p>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-6 sm:px-8">
            <h2 className="text-lg font-semibold text-stone-900">Need to continue?</h2>
            <p className="mt-3 max-w-3xl leading-7 text-stone-700">
              Review the home page for product context or return to the planning flow when you are ready to submit an enquiry.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300 bg-white px-5 py-3 font-semibold text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700">
                Home
              </Link>
              <Link href="/plan" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-800 px-5 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700">
                Plan Celebration
              </Link>
            </div>
          </section>
        </section>
      </main>
    </>
  )
}
