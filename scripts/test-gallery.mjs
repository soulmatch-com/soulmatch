import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import test from 'node:test'
import sharp from 'sharp'
import { celebrationGalleryItems, galleryBrandArtwork } from '../src/lib/celebrations/gallery.ts'
import sitemap from '../src/app/sitemap.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('Gallery publishes only the audited local brand artwork, with accurate dimensions and alt text', async () => {
  assert.equal(celebrationGalleryItems.length, 1)
  assert.equal(new Set(celebrationGalleryItems.map((item) => item.id)).size, celebrationGalleryItems.length)
  for (const item of celebrationGalleryItems) {
    assert.equal(item.src, '/icon.png')
    assert.equal(item.kind, 'brand-art')
    assert.equal(item.category, 'Brand artwork')
    assert.ok(item.alt.trim().length > 20)
    assert.doesNotMatch(item.alt, /\.png|\.jpg|best service/i)
    assert.match(item.caption, /not a photograph of a customer or ceremony/)
    const path = new URL(item.src === '/icon.png' ? 'src/app/icon.png' : 'public' + item.src, root)
    assert.ok((await stat(path)).size < 200_000)
    const dimensions = await sharp(await readFile(path)).metadata()
    assert.equal(item.width, dimensions.width)
    assert.equal(item.height, dimensions.height)
  }
})

test('Gallery shares the root layout and site chrome without local copies', async () => {
  const [page, layout, header, conditionalHeader, conditionalFooter, footer] = await Promise.all([
    read('src/app/gallery/page.tsx'), read('src/app/layout.tsx'), read('src/components/Header.tsx'),
    read('src/components/ConditionalHeader.tsx'), read('src/components/ConditionalFooter.tsx'), read('src/components/SiteFooter.tsx'),
  ])
  assert.doesNotMatch(page, /<header|<footer|<Header|<SiteFooter|GalleryHeader|GalleryFooter|GalleryNavigation/)
  assert.match(layout, /<ConditionalHeader \/>/)
  assert.match(layout, /<ConditionalFooter \/>/)
  assert.match(conditionalHeader, /return <Header \/>/)
  assert.match(conditionalFooter, /return <SiteFooter \/>/)
  assert.match(header, /pathname === '\/gallery'/)
  assert.match(header, /\["Gallery", "\/gallery"\]/)
  assert.match(footer, /\['Gallery', '\/gallery'\]/)
  assert.match(footer, /\['About Us', '\/about'\]/)
})

test('Gallery remains public and indexable with canonical metadata and conservative structured data', async () => {
  const page = await read('src/app/gallery/page.tsx')
  assert.match(page, /const url = 'https:\/\/mythirumanam\.in\/gallery'/)
  assert.match(page, /alternates: \{ canonical: url \}/)
  assert.match(page, /robots: \{ index: true, follow: true \}/)
  assert.match(page, /siteName: 'MyThirumanam'/)
  assert.match(page, /'@type': 'CollectionPage'/)
  assert.match(page, /url: galleryBrandArtwork.src/)
  assert.equal(galleryBrandArtwork.src, '/icon.png')
  assert.doesNotMatch(page, /AggregateRating|ImageGallery|Review|Offer|creator:|event:/)
  const middleware = await read('src/lib/supabase/middleware.ts')
  assert.match(middleware, /const publicRoutes = \[[\s\S]*?'\/gallery'/)
  assert.deepEqual(sitemap().map(({ url }) => new URL(url).pathname).sort(), [
    '/', '/60th-marriage', '/70th-marriage', '/80th-marriage', '/about', '/gallery', '/matrimony', '/terms',
  ])
})

test('Gallery reuses ceremony discovery and provides both planning actions', async () => {
  const page = await read('src/app/gallery/page.tsx')
  assert.match(page, /<CeremonyGrid \/>/)
  assert.equal((page.match(/href="\/plan"/g) ?? []).length, 2)
  assert.match(page, /href="\/"/)
  const grid = await read('src/components/celebrations/CeremonyGrid.tsx')
  assert.match(grid, /import \{ ceremonies \} from '@\/lib\/celebrations'/)
  assert.match(grid, /href=\{`\/\$\{ceremony.slug\}`\}/)
})

test('Gallery is truthful about missing photographs and contains valid Tamil', async () => {
  const page = await read('src/app/gallery/page.tsx')
  assert.match(page, /Celebration photographs are not available yet/)
  assert.match(page, /More celebration moments will be added as approved photographs become available/)
  assert.match(page, /lang="ta"/)
  assert.ok(page.includes('திருக்கடையூரில் நடைபெறும் குடும்ப விழாக்கள்'))
  assert.doesNotMatch(page, /\uFFFD|à®|à¯/)
  const content = celebrationGalleryItems.map(({ title, caption }) => title + ' ' + caption).join(' ')
  assert.doesNotMatch(content, /our customer|our .*event|recent celebration|real ceremony|verified event/i)
})

test('Gallery images use Next Image, stable dimensions, responsive sizes and lazy loading without added client JS', async () => {
  const [page, grid] = await Promise.all([read('src/app/gallery/page.tsx'), read('src/components/celebrations/GalleryGrid.tsx')])
  assert.match(grid, /import Image from 'next\/image'/)
  assert.match(grid, /width=\{item.width\}/)
  assert.match(grid, /height=\{item.height\}/)
  assert.match(grid, /alt=\{item.alt\}/)
  assert.match(grid, /sizes=/)
  assert.match(grid, /loading="lazy"/)
  assert.match(grid, /aspect-square/)
  assert.doesNotMatch(grid, /unoptimized|priority|<img|https?:\/\//)
  assert.doesNotMatch(page + grid, /['"]use client['"]|useEffect|useState/)
  assert.match(grid, /if \(items.length === 0\) return null/)
})
