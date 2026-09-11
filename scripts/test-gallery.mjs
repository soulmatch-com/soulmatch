import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import test from 'node:test'
import {
  approvedCelebrationGalleryItems,
  celebrationGalleryItems,
  galleryBrandArtwork,
  homepageGalleryPreviewItems,
} from '../src/lib/celebrations/gallery.ts'
import sitemap from '../src/app/sitemap.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

const publicSourceFiles = [
  'src/app/gallery/page.tsx',
  'src/app/celebrations/thirukadaiyur/page.tsx',
  'src/components/celebrations/GalleryGrid.tsx',
  'src/lib/celebrations/gallery.ts',
]

test('Gallery uses centralized typed local content instead of inline image data', async () => {
  const [page, galleryConfig] = await Promise.all([
    read('src/app/gallery/page.tsx'),
    read('src/lib/celebrations/gallery.ts'),
  ])

  assert.match(page, /from '@\/lib\/celebrations\/gallery'/)
  assert.match(galleryConfig, /export type CelebrationGalleryItem/)
  assert.match(galleryConfig, /publicationType: 'approved-event-photo' \| 'brand-artwork'/)
  assert.match(galleryConfig, /export const approvedCelebrationGalleryItems/)
  assert.match(galleryConfig, /export const homepageGalleryPreviewItems/)
  assert.doesNotMatch(page, /src:\s*['"]\/.*\.(png|jpe?g|webp|gif|svg)['"]/i)
})

test('Gallery publishes no unapproved event photographs and keeps brand artwork clearly labelled', async () => {
  assert.equal(approvedCelebrationGalleryItems.length, 0)
  assert.equal(homepageGalleryPreviewItems.length, 0)
  assert.equal(celebrationGalleryItems.length, 1)
  assert.equal(galleryBrandArtwork.publicationType, 'brand-artwork')

  for (const item of celebrationGalleryItems) {
    assert.equal(item.publicationType, 'brand-artwork')
    assert.equal(item.category, 'Brand Artwork')
    assert.match(item.caption, /not a photograph of a customer or ceremony/i)
    assert.ok(item.alt.trim().length > 20)
    assert.doesNotMatch(item.alt, /\.png|\.jpg|best service/i)
    assert.match(item.src, /^\//)
    assert.doesNotMatch(item.src, /^https?:\/\//)

    const path = new URL(item.src === '/icon.png' ? 'src/app/icon.png' : `public${item.src}`, root)
    assert.ok((await stat(path)).size > 0)
    assert.ok(Number.isInteger(item.width) && item.width > 0)
    assert.ok(Number.isInteger(item.height) && item.height > 0)
  }
})

test('Gallery shares the approved route, layout chrome and reusable celebration components', async () => {
  const [page, layout, header, conditionalHeader, conditionalFooter, footer] = await Promise.all([
    read('src/app/gallery/page.tsx'),
    read('src/app/layout.tsx'),
    read('src/components/Header.tsx'),
    read('src/components/ConditionalHeader.tsx'),
    read('src/components/ConditionalFooter.tsx'),
    read('src/components/SiteFooter.tsx'),
  ])

  assert.doesNotMatch(page, /<header|<footer|<Header|<SiteFooter|GalleryHeader|GalleryFooter|GalleryNavigation/)
  assert.match(page, /<GalleryGrid items=\{approvedCelebrationGalleryItems\} \/>/)
  assert.match(page, /<GalleryGrid items=\{celebrationGalleryItems\} \/>/)
  assert.match(page, /<CeremonyGrid \/>/)
  assert.match(page, /<CelebrationCTA title="Planning a Celebration in Thirukadaiyur\?" label="Plan Celebration" \/>/)
  assert.match(layout, /<ConditionalHeader \/>/)
  assert.match(layout, /<ConditionalFooter \/>/)
  assert.match(conditionalHeader, /return <Header \/>/)
  assert.match(conditionalFooter, /return <SiteFooter \/>/)
  assert.match(header, /pathname === '\/gallery'/)
  assert.match(header, /\["Gallery", "\/gallery"\]/)
  assert.match(footer, /\['Gallery', '\/gallery'\]/)
})

test('Gallery is public, indexable and uses conservative metadata', async () => {
  const page = await read('src/app/gallery/page.tsx')
  assert.match(page, /const url = 'https:\/\/mythirumanam\.in\/gallery'/)
  assert.match(page, /alternates: \{ canonical: url \}/)
  assert.match(page, /robots: \{ index: true, follow: true \}/)
  assert.match(page, /siteName: 'MyThirumanam'/)
  assert.match(page, /'@type': 'CollectionPage'/)
  assert.match(page, /url: galleryBrandArtwork.src/)
  assert.equal(galleryBrandArtwork.src, '/icon.png')
  assert.doesNotMatch(page, /AggregateRating|Review|Offer|creator:|event:/)

  const middleware = await read('src/lib/supabase/middleware.ts')
  assert.match(middleware, /const publicRoutes = \[[\s\S]*?'\/gallery'/)
  assert.ok(sitemap().some(({ url }) => new URL(url).pathname === '/gallery'))
})

test('Empty approved-gallery state is truthful and the homepage preview is conditional', async () => {
  const [galleryPage, homepage] = await Promise.all([
    read('src/app/gallery/page.tsx'),
    read('src/app/celebrations/thirukadaiyur/page.tsx'),
  ])

  assert.match(galleryPage, /Approved celebration photographs will be added here as they become available/)
  assert.match(galleryPage, /hasApprovedEventPhotos && <GalleryGrid items=\{approvedCelebrationGalleryItems\} \/>/)
  assert.match(galleryPage, /href="\/plan"/)
  assert.match(homepage, /homepageGalleryPreviewItems\.length > 0/)
  assert.match(homepage, /<GalleryGrid items=\{homepageGalleryPreviewItems\} \/>/)
  assert.match(homepage, /href="\/gallery"/)
})

test('Gallery content avoids fake testimonials, fake metrics and unapproved image sources', async () => {
  const sources = await Promise.all(publicSourceFiles.map(read))
  const combined = sources.join('\n')
  const galleryText = celebrationGalleryItems.map(({ title, caption, alt }) => `${title} ${caption} ${alt}`).join(' ')

  assert.doesNotMatch(combined, /our customer|our recent event|customer event|Ravi|Lakshmi|5-star|five-star/i)
  assert.doesNotMatch(combined, /15\+|250\+|500\+|100% satisfaction|No\.1|Most Trusted|Best Thirukadaiyur/i)
  assert.doesNotMatch(combined, /iraivi|googleusercontent|unsplash|pexels|pixabay|stock/i)
  assert.doesNotMatch(galleryText, /our customer|our .*event|recent celebration|real ceremony|verified event/i)
  assert.doesNotMatch(galleryText, /temple partner|authorized temple|official temple|temple booking portal/i)
})

test('Success stories publication gate and temple independence safeguards remain intact', async () => {
  const [successRoute, galleryPage, homepage] = await Promise.all([
    read('src/app/api/success-stories/route.ts'),
    read('src/app/gallery/page.tsx'),
    read('src/app/celebrations/thirukadaiyur/page.tsx'),
  ])

  assert.match(successRoute, /SUCCESS_STORIES_PUBLICATION_APPROVED === 'true'/)
  assert.match(successRoute, /\.eq\('is_published', true\)/)
  assert.match(successRoute, /\.eq\('status', 'approved'\)/)
  assert.match(galleryPage, /<IndependentServiceNotice/)
  assert.match(homepage, /Independent event management/)
  assert.doesNotMatch(galleryPage + homepage, /Call the temple|Contact Thirukadaiyur Temple|Official Booking Number|Temple WhatsApp|temple-affiliated/i)
  assert.doesNotMatch(galleryPage + homepage, /approved:\s*true|publicationType:\s*'approved-event-photo'[\s\S]*src:\s*'\/icon\.png'/)
})

test('Gallery grid uses Next Image with stable dimensions and no client-side gallery dependency', async () => {
  const [page, grid] = await Promise.all([
    read('src/app/gallery/page.tsx'),
    read('src/components/celebrations/GalleryGrid.tsx'),
  ])

  assert.match(grid, /import Image from 'next\/image'/)
  assert.match(grid, /width=\{item.width\}/)
  assert.match(grid, /height=\{item.height\}/)
  assert.match(grid, /alt=\{item.alt\}/)
  assert.match(grid, /sizes=/)
  assert.match(grid, /loading="lazy"/)
  assert.match(grid, /aspect-square/)
  assert.doesNotMatch(grid, /unoptimized|priority|<img|https?:\/\//)
  assert.doesNotMatch(page + grid, /['"]use client['"]|useEffect|useState|masonry|lightbox/)
  assert.match(grid, /if \(items.length === 0\) return null/)
})
