import type { Metadata } from 'next'
import { CelebrationBreadcrumbs } from '@/components/celebrations/CelebrationBreadcrumbs'
import { CelebrationEnquiryForm } from '@/components/celebrations/CelebrationEnquiryForm'
import { PlanV2Flow } from '@/components/celebrations/PlanV2Flow'
import { getCeremony, isCeremonySlug } from '@/lib/celebrations'
import { loadCelebrationServices } from '@/lib/celebrations/page-data'
import { celebrationPlanV2Enabled } from '@/lib/celebrations/plan-v2'

const url = 'https://mythirumanam.in/plan'
export const metadata: Metadata = { title: 'Plan a Thirukadaiyur Celebration | MyThirumanam', description: 'Begin planning a 60th, 70th or 80th marriage celebration at Thirukadaiyur.', alternates: { canonical: url }, robots: { index: false, follow: true } }

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ ceremony?: string }> }) {
  const value = (await searchParams).ceremony
  const initialCeremony = isCeremonySlug(value) ? value : undefined
  const ceremony = initialCeremony ? getCeremony(initialCeremony) : undefined
  const { services, failed } = await loadCelebrationServices()

  return <main className="min-h-screen bg-[#fffaf3] text-stone-900"><div className="mx-auto max-w-5xl px-4 sm:px-6"><CelebrationBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Plan Celebration' }]} />{celebrationPlanV2Enabled ? <PlanV2Flow services={services} initialCeremony={initialCeremony} /> : <section className="py-12 sm:py-16"><p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Celebration planning</p><h1 className="mt-3 text-4xl font-bold sm:text-5xl">{ceremony ? `Plan your ${ceremony.title}` : 'Plan your Thirukadaiyur celebration'}</h1>{ceremony && <p className="mt-3 font-semibold text-amber-800">{ceremony.traditionalName}</p>}<p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">Share your family’s ceremony requirements, preferred dates and requested services. No matrimonial account is needed.</p><div className="mt-10"><CelebrationEnquiryForm services={services} initialCeremony={initialCeremony} servicesAvailable={!failed} /></div></section>}</div></main>
}
