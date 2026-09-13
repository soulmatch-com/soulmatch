import Link from 'next/link'
import { Check, Flower2 } from 'lucide-react'
import type { CeremonyContent } from '@/lib/celebrations'
import type { PublicCelebrationService } from '@/lib/celebrations/services'
import { CelebrationBreadcrumbs } from './CelebrationBreadcrumbs'
import { CelebrationServices } from './CelebrationServices'
import { PlanningSteps } from './PlanningSteps'
import { CelebrationCTA } from './CelebrationCTA'
import { CelebrationContactActions } from './CelebrationContactActions'
import { JsonLd } from '@/components/seo/JsonLd'

export function CeremonyPage({ ceremony, services, servicesFailed }: { ceremony: CeremonyContent; services: PublicCelebrationService[]; servicesFailed: boolean }) {
  const pageUrl = `https://mythirumanam.in/${ceremony.slug}`
  const pageName = `${ceremony.title} in Thirukadaiyur – ${ceremony.traditionalName}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: pageName, url: pageUrl, description: ceremony.summary },
      { '@type': 'Service', name: `${ceremony.title} Planning in Thirukadaiyur`, serviceType: `${ceremony.title} celebration planning`, areaServed: 'Thirukadaiyur', url: pageUrl },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mythirumanam.in/' },
        { '@type': 'ListItem', position: 2, name: ceremony.title, item: pageUrl },
      ] },
    ],
  }
  return <><JsonLd data={jsonLd} /><main className="min-h-screen bg-[#fffaf3] text-stone-900">
    <div className="mx-auto max-w-6xl px-4 sm:px-6"><CelebrationBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: ceremony.title }]} /></div>
    <section className="overflow-hidden bg-gradient-to-br from-[#681c24] via-[#8f2d2e] to-[#bd6b2f] text-white"><div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_auto] md:py-24"><div><p className="font-semibold text-amber-200">{ceremony.traditionalName}</p><h1 className="mt-2 text-4xl font-bold leading-tight sm:text-5xl">{ceremony.title} at Thirukadaiyur</h1><p lang="ta" className="mt-4 text-lg leading-relaxed text-amber-100">{ceremony.tamilName}</p><p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85">{ceremony.summary}</p></div><div aria-hidden="true" className="flex h-36 w-36 flex-col items-center justify-center rounded-full border border-amber-200/40 bg-white/10"><span className="text-6xl font-black">{ceremony.years}</span><span className="text-sm text-amber-100">years</span></div></div></section>
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2"><div><p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-amber-800"><Flower2 aria-hidden="true" className="h-5 w-5" />Overview &amp; significance</p><h2 className="mt-3 text-3xl font-bold">A milestone shared across generations</h2><p className="mt-5 leading-7 text-stone-700">{ceremony.significance}</p><div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-stone-700"><p>{ceremony.timingGuidance}</p><p lang="ta" className="mt-3 leading-7">{ceremony.timingGuidanceTamil}</p></div></div><div><h2 className="text-3xl font-bold">Why families choose Thirukadaiyur</h2><p className="mt-5 leading-7 text-stone-700">{ceremony.thirukadaiyur}</p><Link className="mt-6 inline-flex min-h-11 items-center font-bold text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700" href="/">Explore Thirukadaiyur celebrations</Link></div></section>
    <section className="border-y border-amber-200 bg-white py-16"><div className="mx-auto max-w-6xl px-4 sm:px-6"><h2 className="text-3xl font-bold">Common planning considerations</h2><ul className="mt-8 grid gap-4 sm:grid-cols-2">{ceremony.considerations.map((item) => <li className="flex gap-3 rounded-xl bg-amber-50 p-4" key={item}><Check aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" /><span>{item}</span></li>)}</ul></div></section>
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-800">Services you can request</p><h2 className="mt-3 text-3xl font-bold">Support for your family’s arrangements</h2><p className="mt-3 mb-8 max-w-3xl text-stone-600">Services are requestable and subject to availability and confirmation.</p>{servicesFailed ? <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5">Available services could not be loaded right now. Please try again shortly.</p> : <CelebrationServices services={services} />}</section>
    <section className="border-y border-amber-200 bg-white py-16"><div className="mx-auto max-w-6xl px-4 sm:px-6"><h2 className="text-3xl font-bold">How planning works</h2><div className="mt-9"><PlanningSteps /></div></div></section>
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6"><h2 className="text-3xl font-bold">Frequently asked questions</h2><div className="mt-8 divide-y divide-amber-200 rounded-2xl border border-amber-200 bg-white px-5 sm:px-7">{ceremony.faqs.map((faq) => <details key={faq.question} className="py-5"><summary className="cursor-pointer font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700">{faq.question}</summary><p className="mt-3 leading-7 text-stone-600">{faq.answer}</p></details>)}</div></section>
    <CelebrationCTA title={`Plan your ${ceremony.title} at Thirukadaiyur`} href={`/plan?ceremony=${ceremony.slug}`} label={`Plan ${ceremony.years}th Marriage`} />
  </main><CelebrationContactActions variant="mobile-sticky" /></>
}
