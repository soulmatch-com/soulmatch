import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CelebrationBreadcrumbs } from '@/components/celebrations/CelebrationBreadcrumbs'
import { CeremonyGrid } from '@/components/celebrations/CeremonyGrid'
import { GalleryGrid } from '@/components/celebrations/GalleryGrid'
import { JsonLd } from '@/components/seo/JsonLd'
import { CelebrationCTA } from '@/components/celebrations/CelebrationCTA'
import { IndependentServiceNotice } from '@/components/celebrations/IndependentServiceNotice'
import { approvedCelebrationGalleryItems, celebrationGalleryItems, galleryBrandArtwork } from '@/lib/celebrations/gallery'

const url = 'https://mythirumanam.in/gallery'
const title = 'Thirukadaiyur Celebration Gallery | MyThirumanam'
const description = 'View MyThirumanam gallery updates for milestone marriage celebrations in Thirukadaiyur, with approved celebration photographs added as they become available.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    url,
    siteName: 'MyThirumanam',
    type: 'website',
    images: [{ url: galleryBrandArtwork.src, width: galleryBrandArtwork.width, height: galleryBrandArtwork.height, alt: galleryBrandArtwork.alt }],
  },
}

export default function GalleryPage() {
  const hasApprovedEventPhotos = approvedCelebrationGalleryItems.length > 0

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Celebration Gallery', url, description }} />
      <main className="min-h-screen bg-[#fffaf3] text-stone-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <CelebrationBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Gallery' }]} />
        </div>
        <section className="overflow-hidden bg-gradient-to-br from-[#5d1720] via-[#8f2d2e] to-[#bd6b2f] text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-200">Thirukadaiyur Celebrations</p>
            <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Celebration Gallery</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-amber-50">
              Moments, traditions and arrangements surrounding milestone marriage celebrations in Thirukadaiyur.
            </p>
            <p lang="ta" className="mt-4 max-w-3xl leading-8 text-amber-100">
              திருக்கடையூரில் நடைபெறும் திருமண மைல்கல் விழாக்களின் தருணங்கள் மற்றும் ஏற்பாடுகளின் காட்சிகள்.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/plan" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-bold text-stone-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                Plan Celebration <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
              <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/50 px-6 py-3 font-bold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                Explore Celebrations
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="gallery-collection-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-9 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Visual trust</p>
            <h2 id="gallery-collection-heading" className="mt-3 text-3xl font-bold">
              {hasApprovedEventPhotos ? 'Approved Celebration Photographs' : 'Approved celebration photographs will be added here'}
            </h2>
            {hasApprovedEventPhotos ? (
              <p className="mt-5 leading-7 text-stone-700">These photographs are published only when MyThirumanam has appropriate publication approval.</p>
            ) : (
              <p className="mt-5 leading-7 text-stone-700">Approved celebration photographs will be added here as they become available. Until then, this page shows only MyThirumanam-owned brand artwork and ceremony planning links.</p>
            )}
            <IndependentServiceNotice className="mt-4 max-w-3xl text-stone-600" />
          </div>
          {hasApprovedEventPhotos && <GalleryGrid items={approvedCelebrationGalleryItems} />}
        </section>

        <section aria-labelledby="gallery-artwork-heading" className="border-y border-amber-200 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-9 max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Brand artwork</p>
              <h2 id="gallery-artwork-heading" className="mt-3 text-3xl font-bold">MyThirumanam Visual Identity</h2>
              <p className="mt-4 leading-7 text-stone-600">This artwork represents the MyThirumanam brand. It is not presented as customer, ceremony or event photography.</p>
            </div>
            <GalleryGrid items={celebrationGalleryItems} />
          </div>
        </section>

        <section aria-labelledby="gallery-ceremonies-heading" className="bg-amber-50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Explore your milestone</p>
            <h2 id="gallery-ceremonies-heading" className="mt-3 text-3xl font-bold">Find the celebration for your family</h2>
            <p className="mt-4 max-w-3xl leading-7 text-stone-600">Learn about each ceremony and the arrangements your family can request, from ceremony planning support to meals, accommodation and travel.</p>
            <div className="mt-9"><CeremonyGrid /></div>
          </div>
        </section>

        <CelebrationCTA title="Planning a Celebration in Thirukadaiyur?" label="Plan Celebration" />
      </main>
    </>
  )
}
