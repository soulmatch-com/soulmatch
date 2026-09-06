import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CelebrationBreadcrumbs } from '@/components/celebrations/CelebrationBreadcrumbs'
import { CeremonyGrid } from '@/components/celebrations/CeremonyGrid'
import { GalleryGrid } from '@/components/celebrations/GalleryGrid'
import { JsonLd } from '@/components/seo/JsonLd'
import { celebrationGalleryItems, galleryBrandArtwork } from '@/lib/celebrations/gallery'

const url = 'https://mythirumanam.in/gallery'
const title = 'Thirukadaiyur Celebration Gallery | MyThirumanam'
const description = 'Explore celebration moments and arrangements for 60th, 70th and 80th marriage ceremonies in Thirukadaiyur with MyThirumanam.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  robots: { index: true, follow: true },
  openGraph: { title, description, url, siteName: 'MyThirumanam', type: 'website',
    images: [{ url: galleryBrandArtwork.src, width: galleryBrandArtwork.width, height: galleryBrandArtwork.height, alt: galleryBrandArtwork.alt }],
  },
}

export default function GalleryPage() {
  const hasEventPhotos = celebrationGalleryItems.some((item) => item.kind === 'event-photo')

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
              A space for the meaningful moments, traditions and arrangements surrounding milestone marriage celebrations in Thirukadaiyur.
            </p>
            <p lang="ta" className="mt-4 max-w-3xl leading-8 text-amber-100">
              திருக்கடையூரில் நடைபெறும் குடும்ப விழாக்கள், பாரம்பரிய தருணங்கள் மற்றும் விழா ஏற்பாடுகளின் காட்சிகள்.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/plan" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-bold text-stone-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                Start Planning <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
              <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/50 px-6 py-3 font-bold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                Explore Celebrations
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="gallery-collection-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-9 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Family milestones</p>
            <h2 id="gallery-collection-heading" className="mt-3 text-3xl font-bold">
              {hasEventPhotos ? 'Celebration moments' : 'Celebration moments, coming soon'}
            </h2>
            {!hasEventPhotos && <p className="mt-5 leading-7 text-stone-700">Celebration photographs are not available yet. The artwork shown here is the MyThirumanam emblem.</p>}
            <p className="mt-3 leading-7 text-stone-600">More celebration moments will be added as approved photographs become available.</p>
          </div>
          <GalleryGrid items={celebrationGalleryItems} />
        </section>

        <section aria-labelledby="gallery-ceremonies-heading" className="border-y border-amber-200 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Explore your milestone</p>
            <h2 id="gallery-ceremonies-heading" className="mt-3 text-3xl font-bold">Find the celebration for your family</h2>
            <p className="mt-4 max-w-3xl leading-7 text-stone-600">Learn about each ceremony and the arrangements your family can request, from ceremony coordination to meals, accommodation and travel.</p>
            <div className="mt-9"><CeremonyGrid /></div>
          </div>
        </section>

        <section className="bg-stone-900 py-16 text-white">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold">Planning Your Celebration in Thirukadaiyur?</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-stone-300">Tell us about your family&apos;s celebration, preferred date and the services you need.</p>
            <Link href="/plan" className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-bold text-stone-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-auto">
              Start Planning <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
