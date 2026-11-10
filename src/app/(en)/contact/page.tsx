import type { Metadata } from 'next'
import Link from 'next/link'
import { CelebrationBreadcrumbs } from '@/components/celebrations/CelebrationBreadcrumbs'
import { CelebrationContactActions } from '@/components/celebrations/CelebrationContactActions'
import { JsonLd } from '@/components/seo/JsonLd'
import { businessContact, businessContactLinks } from '@/lib/business-contact'

const url = 'https://mythirumanam.com/contact'
const title = 'Contact & Grievance Support | MyThirumanam'
const description = 'Contact MyThirumanam for Thirukadaiyur celebration enquiries, existing booking support, privacy requests, corrections, deletion requests and grievances.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  robots: { index: true, follow: true },
  openGraph: { title, description, url, siteName: 'MyThirumanam', type: 'website' },
  twitter: { card: 'summary_large_image', title, description, images: ['/brand/mythirumanam-logo.png'] },
}

export default function ContactPage() {
  const hasContactDetails = businessContact.bookingsEmail || businessContactLinks.callHref || businessContactLinks.whatsappHref
  const linkClassName = 'font-semibold text-amber-800 underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700'

  return <>
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ContactPage', name: title, url, description }} />
    <main className="min-h-screen bg-[#fffaf3] text-stone-900">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <CelebrationBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Contact & Grievance Support' }]} />
        <section className="py-12 sm:py-16">
          <h1 className="text-4xl font-bold">Contact &amp; Grievance Support</h1>
          <p className="mt-5 max-w-3xl leading-8 text-stone-700">Contact MyThirumanam for help with a Thirukadaiyur celebration enquiry, an existing booking, a service concern or a request about your personal information.</p>
          <section aria-labelledby="contact-team" className="mt-8 rounded-2xl border border-amber-200 bg-white p-5 sm:p-6">
            <h2 id="contact-team" className="text-2xl font-bold">Contact the MyThirumanam team</h2>
            {hasContactDetails ? <div className="mt-5 space-y-4">
              <CelebrationContactActions tone="light" showPlan={false} />
              {businessContact.bookingsEmail && <p><a className={`${linkClassName} break-words`} href={`mailto:${businessContact.bookingsEmail}`}>{businessContact.bookingsEmail}</a></p>}
            </div> : <p className="mt-4 leading-7 text-stone-700">Contact options are temporarily unavailable. Please try again later.</p>}
          </section>
          <div className="mt-8 space-y-8 leading-8 text-stone-700">
            <section aria-labelledby="celebration-enquiries">
              <h2 id="celebration-enquiries" className="text-2xl font-bold text-stone-900">New celebration enquiries</h2>
              <p className="mt-3">For a 60th, 70th or 80th marriage celebration, use the <Link href="/plan" className={linkClassName}>celebration planning form</Link> to share your preferred date, approximate guest count and the arrangements you need. Final arrangements, availability and pricing are confirmed after our team reviews your enquiry.</p>
            </section>
            <section aria-labelledby="booking-support">
              <h2 id="booking-support" className="text-2xl font-bold text-stone-900">Existing enquiries and booking support</h2>
              <p className="mt-3">When following up, include your contact name, celebration date and enquiry or booking reference if you have one. Explain which arrangement you need help with, such as accommodation, food, photography or transportation, so the team can understand your request.</p>
            </section>
            <section aria-labelledby="privacy-grievances">
              <h2 id="privacy-grievances" className="text-2xl font-bold text-stone-900">Privacy requests and grievances</h2>
              <p className="mt-3">Use the contact options above for personal-information corrections, deletion requests or service grievances. Describe the issue, the relevant enquiry or booking reference, and the outcome you are requesting. Share only the information needed to explain your request.</p>
              <p className="mt-3">Read our <Link href="/privacy" className={linkClassName}>Privacy Policy</Link> for information about personal data and our <Link href="/terms" className={linkClassName}>Terms &amp; Conditions</Link> for service terms.</p>
            </section>
          </div>
        </section>
      </div>
    </main>
  </>
}
