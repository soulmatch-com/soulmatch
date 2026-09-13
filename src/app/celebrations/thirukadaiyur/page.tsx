import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ClipboardList, HeartHandshake, Landmark, ListChecks, MessageSquareText, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { CeremonyGrid } from '@/components/celebrations/CeremonyGrid'
import { CelebrationServices } from '@/components/celebrations/CelebrationServices'
import { PlanningSteps } from '@/components/celebrations/PlanningSteps'
import { JsonLd } from '@/components/seo/JsonLd'
import { CelebrationCTA } from '@/components/celebrations/CelebrationCTA'
import { IndependentServiceNotice } from '@/components/celebrations/IndependentServiceNotice'
import { CelebrationContactActions } from '@/components/celebrations/CelebrationContactActions'
import { GalleryGrid } from '@/components/celebrations/GalleryGrid'
import { loadCelebrationServices } from '@/lib/celebrations/page-data'
import { homepageGalleryPreviewItems } from '@/lib/celebrations/gallery'

const url = 'https://mythirumanam.in/'

export const metadata: Metadata = {
  title: 'Thirukadaiyur 60th, 70th & 80th Marriage | MyThirumanam',
  description: 'Plan 60th, 70th and 80th marriage celebrations in Thirukadaiyur with ceremony guidance, service selection and family-focused planning support.',
  alternates: { canonical: url },
  openGraph: {
    title: 'Thirukadaiyur 60th, 70th & 80th Marriage | MyThirumanam',
    description: 'Plan 60th, 70th and 80th marriage celebrations in Thirukadaiyur with ceremony guidance, service selection and family-focused planning support.',
    url,
    siteName: 'MyThirumanam',
    type: 'website',
  },
}

const trust = [
  [HeartHandshake, 'Family-focused support', 'A planning conversation centred on your elders, guests and family priorities.'],
  [Landmark, 'Tradition-aware planning', 'Room for the customs and guidance that matter to your family and community.'],
  [ListChecks, 'Flexible planning', "Choose services based on your family's needs, with availability and next steps discussed before confirmation."],
  [ShieldCheck, 'Independent event management', 'MyThirumanam is an independent event-management and coordination service.'],
] as const

const faqs = [
  { q: 'Which celebrations can MyThirumanam help plan?', a: 'The initial Thirukadaiyur offering covers 60th Marriage, 70th Marriage and 80th Marriage celebrations.' },
  { q: 'Are all listed services guaranteed to be available?', a: 'No. They are services you may request. Availability, providers, scope and costs are confirmed during planning.' },
  { q: 'Will our family customs be accommodated?', a: 'Planning starts with your requirements. Exact rituals and timings should be decided with your family and chosen Vadhyar or priest.' },
]

const homepageSteps = [
  { title: 'Tell Us About Your Celebration', description: 'Choose the 60th, 70th or 80th marriage celebration you are planning and share the basic family and event details.', icon: ClipboardList },
  { title: 'Choose the Support You Need', description: 'Select the ceremony and event services your family needs, including food, stay, photography, transportation and other available arrangements.', icon: SlidersHorizontal },
  { title: 'We Help Coordinate the Next Steps', description: 'Send your planning request and our team can review your requirements and discuss the next steps with you.', icon: MessageSquareText },
] as const

const tamilContent = {
  heroEyebrow: 'திருக்கடையூர் குடும்ப விழாக்கள்',
  heroHeading: 'வாழ்க்கையின் முக்கிய திருமண தருணங்களை குடும்பத்துடன் கொண்டாடுங்கள்',
  heroDescription: '60ஆம், 70ஆம் மற்றும் 80ஆம் திருமண விழாக்களை திருக்கடையூரில் உங்கள் குடும்பத் தேவைகளுக்கு ஏற்ப திட்டமிட உதவுகிறோம்.',
  planCelebration: 'விழாவை திட்டமிடுங்கள்',
  stepsIntro: 'உங்கள் குடும்பத்தின் விழா தேவைகளை எளிதாக பகிர்ந்து திட்டமிடத் தொடங்கும் வழி.',
  stepsCta: 'விழாவை திட்டமிட தயாரா?',
  servicesIntro: 'உங்கள் குடும்பத்திற்கு தேவையான சேவைகளை மட்டும் தேர்வு செய்யலாம்.',
  contactIntro: 'உங்கள் விழா விவரங்களை திட்டமிடும் படிவத்தின் மூலம் பகிரலாம் அல்லது எங்கள் குழுவை நேரடியாக தொடர்பு கொள்ளலாம்.',
} as const

export default async function ThirukadaiyurPage() {
  const { services, failed } = await loadCelebrationServices()

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'MyThirumanam', url }} />
      <main className="min-h-screen bg-[#fffaf3] text-stone-900">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#5d1720] via-[#8f2d2e] to-[#bd6b2f] text-white">
          <div aria-hidden="true" className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[60px] border-amber-300/10" />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-100">Thirukadaiyur Celebrations</p>
            <p lang="ta" className="mt-3 text-lg font-semibold text-amber-200">{tamilContent.heroEyebrow}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">Celebrate Life&apos;s Meaningful Marriage Milestones</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-amber-50">Plan 60th, 70th and 80th marriage celebrations in Thirukadaiyur with flexible support for your family&apos;s ceremony and event requirements.</p>
            <div lang="ta" className="mt-4 max-w-3xl text-base leading-8 text-amber-100">
              <p className="font-semibold">{tamilContent.heroHeading}</p>
              <p className="mt-2">{tamilContent.heroDescription}</p>
            </div>
            <IndependentServiceNotice className="mt-6 max-w-3xl text-amber-100" />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/plan" aria-label="Plan Celebration" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-bold text-stone-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                Plan Celebration <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
              <a href="#ceremonies" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/40 px-6 py-3 font-bold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Explore Celebrations</a>
            </div>
            <p lang="ta" className="mt-3 text-sm font-semibold text-amber-100">{tamilContent.planCelebration}</p>
          </div>
        </section>

        <section id="ceremonies" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-6 md:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Choose your ceremony</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">60th, 70th and 80th Marriage Celebrations</h2>
          <p className="mt-4 max-w-3xl leading-7 text-stone-600">Select the milestone your family is planning. Each celebration page explains the ceremony name, traditional context and planning considerations.</p>
          <div className="mt-10"><CeremonyGrid /></div>
        </section>

        <section className="border-y border-amber-200 bg-amber-50 py-14 md:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Simple planning process</p>
            <h2 className="mt-3 text-3xl font-bold">How MyThirumanam Helps</h2>
            <p className="mt-4 max-w-3xl leading-7 text-stone-700">A simple way to share your family&apos;s celebration requirements and begin planning.</p>
            <p lang="ta" className="mt-2 max-w-3xl leading-8 text-stone-700">{tamilContent.stepsIntro}</p>
            <div className="mt-9"><PlanningSteps steps={homepageSteps} variant="card" /></div>
            <div className="mt-10 border-t border-amber-200 pt-8 text-center">
              <h3 className="text-2xl font-bold text-stone-900">Ready to plan your celebration?</h3>
              <p lang="ta" className="mt-2 font-semibold text-amber-900">{tamilContent.stepsCta}</p>
              <Link href="/plan" className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-800 px-6 py-3 font-bold text-white hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700">
                Plan Celebration <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-amber-200 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Services you can request</p>
                <h2 className="mt-3 text-3xl font-bold">What We Can Help Arrange</h2>
              </div>
              {!failed && services.length > 0 && <p className="text-sm font-semibold text-amber-800">{services.length} available {services.length === 1 ? 'service' : 'services'}</p>}
            </div>
            <p className="mt-4 max-w-3xl leading-7 text-stone-600">Choose the support your family needs for the celebration. Services can be selected individually based on your requirements.</p>
            <p className="mt-3 max-w-3xl leading-7 text-stone-600">Choose only the services your family needs, or select Complete Arrangement if you would like broader planning support.</p>
            <p lang="ta" className="mt-3 mb-9 max-w-3xl leading-8 text-stone-600">{tamilContent.servicesIntro}</p>
            {failed ? <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5">Available services could not be loaded right now. Please try again shortly.</p> : <CelebrationServices services={services} />}
            <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
              <h3 className="text-2xl font-bold text-stone-900">Need help planning?</h3>
              <p className="mx-auto mt-2 max-w-2xl leading-7 text-stone-700">Tell us about your celebration through the planning form, or contact our team directly.</p>
              <p lang="ta" className="mx-auto mt-2 max-w-2xl leading-8 text-stone-700">{tamilContent.contactIntro}</p>
              <div className="mt-5 flex justify-center"><CelebrationContactActions tone="light" /></div>
            </div>
          </div>
        </section>

        {homepageGalleryPreviewItems.length > 0 && (
          <section aria-labelledby="homepage-gallery-heading" className="border-b border-amber-200 bg-amber-50 py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Celebration moments</p>
              <h2 id="homepage-gallery-heading" className="mt-3 text-3xl font-bold">Approved Celebration Photographs</h2>
              <p className="mt-4 max-w-3xl leading-7 text-stone-700">A small preview of approved MyThirumanam celebration photographs and arrangements.</p>
              <div className="mt-9"><GalleryGrid items={homepageGalleryPreviewItems} /></div>
              <Link href="/gallery" className="mt-7 inline-flex min-h-11 items-center gap-2 font-bold text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700">
                View Gallery <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
            </div>
          </section>
        )}

        <section className="bg-amber-50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold">Why choose MyThirumanam</h2>
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {trust.map(([Icon, title, text]) => (
                <article className="rounded-2xl bg-white p-5 shadow-sm" key={title}>
                  <Icon aria-hidden="true" className="h-7 w-7 text-amber-800" />
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">About the destination</p>
            <h2 className="mt-3 text-3xl font-bold">Planning a family gathering in Thirukadaiyur</h2>
            <p className="mt-5 leading-7 text-stone-600">Thirukadaiyur is closely associated with family prayers for longevity and milestone observances. A practical plan can account for ceremony planning support, temple-related planning assistance, local venues, meals, travel and elder comfort while respecting your family&apos;s chosen customs.</p>
          </div>
          <div>
            <h2 className="text-3xl font-bold">Frequently asked questions</h2>
            <div className="mt-5 divide-y divide-amber-200 rounded-2xl border border-amber-200 bg-white px-5">
              {faqs.map((faq) => (
                <details className="py-5" key={faq.q}>
                  <summary className="cursor-pointer font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700">{faq.q}</summary>
                  <p className="mt-3 leading-7 text-stone-600">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-amber-200 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">Matrimony</p>
            <h2 className="mt-3 text-3xl font-bold">Looking for a life partner?</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-stone-600">Explore MyThirumanam Matrimony for family-focused matching, profile creation and member access.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/matrimony" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 px-6 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">Explore Matrimony</Link>
              <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-blue-700 px-6 py-3 font-bold text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">Create Profile</Link>
            </div>
          </div>
        </section>

        <CelebrationCTA title="Ready to plan your celebration?" label="Plan Celebration" />
      </main>
      <CelebrationContactActions variant="mobile-sticky" />
    </>
  )
}
