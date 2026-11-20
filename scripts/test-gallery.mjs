import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import test from 'node:test'
import { celebrationGalleryItems, galleryBrandArtwork } from '../src/lib/celebrations/gallery.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

const publicSourceFiles = [
  'src/app/(en)/gallery/page.tsx',
  'src/app/(en)/celebrations/thirukadaiyur/page.tsx',
  'src/components/celebrations/GalleryGrid.tsx',
  'src/components/celebrations/GalleryCollection.tsx',
  'src/lib/celebrations/gallery.ts',
]

test('Gallery reads approved photographs from the managed collection', async () => {
  const [page, galleryConfig, repository, migration, eventLimitMigration, adminPage, collection, publicApi] = await Promise.all([
    read('src/app/(en)/gallery/page.tsx'),
    read('src/lib/celebrations/gallery.ts'),
    read('src/lib/celebrations/gallery-repository.ts'),
    read('supabase/migrations/20261119000000_create_celebration_gallery.sql'),
    read('supabase/migrations/20261120000000_limit_gallery_photos_per_event.sql'),
    read('src/app/(en)/admin/(protected)/gallery/page.tsx'),
    read('src/components/celebrations/GalleryCollection.tsx'),
    read('src/app/api/gallery/route.ts'),
  ])

  assert.match(page, /getPublishedGalleryPage/)
  assert.match(galleryConfig, /export type CelebrationGalleryItem/)
  assert.match(galleryConfig, /publicationType: 'approved-event-photo' \| 'brand-artwork'/)
  assert.match(repository, /\.eq\('status', 'published'\)/)
  assert.match(repository, /\.eq\('publication_consent_confirmed', true\)/)
  assert.match(repository, /Confirm publication consent before publishing/)
  assert.match(migration, /celebration_gallery_items/)
  assert.match(migration, /publication_consent_confirmed boolean not null default false/)
  assert.match(eventLimitMigration, /at most five photographs/)
  assert.match(adminPage, /GalleryManager/)
  assert.match(collection, /\/api\/gallery\?offset=/)
  assert.match(collection, /Load more photographs/)
  assert.match(publicApi, /getPublishedGalleryPage/)
})

test('Gallery keeps brand artwork clearly labelled', async () => {
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
  const [page, layout, rootDocument, header, conditionalHeader, conditionalFooter, footer] = await Promise.all([
    read('src/app/(en)/gallery/page.tsx'),
    read('src/app/(en)/layout.tsx'),
    read('src/app/root-document.tsx'),
    read('src/components/Header.tsx'),
    read('src/components/ConditionalHeader.tsx'),
    read('src/components/ConditionalFooter.tsx'),
    read('src/components/SiteFooter.tsx'),
  ])

  assert.doesNotMatch(page, /<header|<footer|<Header|<SiteFooter|GalleryHeader|GalleryFooter|GalleryNavigation/)
  assert.match(page, /<GalleryCollection initialItems=\{approvedCelebrationGalleryItems\}/)
  assert.match(page, /<GalleryGrid items=\{celebrationGalleryItems\} \/>/)
  assert.match(page, /<CeremonyGrid \/>/)
  assert.match(page, /<CelebrationCTA title="Planning a Celebration in Thirukadaiyur\?" label="Plan Celebration" \/>/)
  assert.match(layout, /<RootDocument language="en">\{children\}<\/RootDocument>/)
  assert.match(rootDocument, /<ConditionalHeader \/>/)
  assert.match(conditionalHeader, /return <Header \/>/)
  assert.match(rootDocument, /<ConditionalFooter \/>/)
  assert.match(conditionalFooter, /return <SiteFooter \/>/)
  assert.match(header, /pathname === '\/gallery'/)
  assert.match(header, /\["Gallery", "\/gallery"\]/)
  assert.match(footer, /\['Gallery', '\/gallery'\]/)
})

test('Gallery is public, indexable and uses conservative metadata', async () => {
  const page = await read('src/app/(en)/gallery/page.tsx')
  assert.match(page, /const url = 'https:\/\/mythirumanam\.com\/gallery'/)
  assert.match(page, /alternates: \{ canonical: url \}/)
  assert.match(page, /robots: \{ index: true, follow: true \}/)
  assert.match(page, /siteName: 'MyThirumanam'/)
  assert.match(page, /'@type': 'CollectionPage'/)
  assert.match(page, /url: galleryBrandArtwork.src/)
  assert.equal(galleryBrandArtwork.src, '/icon.png')
  assert.doesNotMatch(page, /AggregateRating|Review|Offer|creator:|event:/)

  const middleware = await read('src/lib/supabase/middleware.ts')
  assert.match(middleware, /const publicRoutes = \[[\s\S]*?'\/gallery'/)
  const sitemap = await read('src/app/sitemap.ts')
  assert.match(sitemap, /'\/gallery'/)
})

test('Empty approved-gallery state is truthful and the homepage preview is conditional', async () => {
  const [galleryPage, homepage] = await Promise.all([
    read('src/app/(en)/gallery/page.tsx'),
    read('src/app/(en)/celebrations/thirukadaiyur/page.tsx'),
  ])

  assert.match(galleryPage, /Approved celebration photographs will be added here as they become available/)
  assert.match(galleryPage, /hasApprovedEventPhotos && <GalleryCollection initialItems=\{approvedCelebrationGalleryItems\}/)
  assert.match(galleryPage, /href="\/plan"/)
  assert.match(homepage, /getPublishedGalleryPage\(0, 6\)/)
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
    read('src/app/(en)/gallery/page.tsx'),
    read('src/app/(en)/celebrations/thirukadaiyur/page.tsx'),
  ])

  assert.match(successRoute, /SUCCESS_STORIES_PUBLICATION_APPROVED === 'true'/)
  assert.match(successRoute, /\.eq\('is_published', true\)/)
  assert.match(successRoute, /\.eq\('status', 'approved'\)/)
  assert.match(galleryPage, /<IndependentServiceNotice/)
  assert.match(homepage, /Independent event management/)
  assert.doesNotMatch(galleryPage + homepage, /Call the temple|Contact Thirukadaiyur Temple|Official Booking Number|Temple WhatsApp|temple-affiliated/i)
  assert.doesNotMatch(galleryPage + homepage, /approved:\s*true|publicationType:\s*'approved-event-photo'[\s\S]*src:\s*'\/icon\.png'/)
})

test('Gallery grid uses optimized thumbnails and the collection loads additional pages on demand', async () => {
  const [grid, collection, repository] = await Promise.all([
    read('src/components/celebrations/GalleryGrid.tsx'),
    read('src/components/celebrations/GalleryCollection.tsx'),
    read('src/lib/celebrations/gallery-repository.ts'),
  ])

  assert.match(grid, /import Image from 'next\/image'/)
  assert.match(grid, /width=\{item.width\}/)
  assert.match(grid, /height=\{item.height\}/)
  assert.match(grid, /alt=\{item.alt\}/)
  assert.match(grid, /sizes=/)
  assert.match(grid, /loading="lazy"/)
  assert.match(grid, /aspect-square/)
  assert.doesNotMatch(grid, /unoptimized|priority|<img|https?:\/\//)
  assert.match(collection, /useState/)
  assert.match(collection, /\/api\/gallery\?offset=/)
  assert.match(repository, /Math\.min\(12/)
  assert.match(grid, /if \(items.length === 0\) return null/)
})
