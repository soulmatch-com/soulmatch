import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import sitemap from '../src/app/sitemap.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const publicPages = [
  ['src/app/celebrations/thirukadaiyur/page.tsx', 'https://mythirumanam.in/'],
  ['src/app/celebrations/thirukadaiyur/60th-marriage/page.tsx', 'https://mythirumanam.in/60th-marriage'],
  ['src/app/celebrations/thirukadaiyur/70th-marriage/page.tsx', 'https://mythirumanam.in/70th-marriage'],
  ['src/app/celebrations/thirukadaiyur/80th-marriage/page.tsx', 'https://mythirumanam.in/80th-marriage'],
  ['src/app/matrimony/page.tsx', 'https://mythirumanam.in/matrimony'],
  ['src/app/about/page.tsx', 'https://mythirumanam.in/about'],
  ['src/app/gallery/page.tsx', 'https://mythirumanam.in/gallery'],
]

test('metadata base and concise Celebrations-first homepage title are configured', async () => {
  assert.match(await read('src/app/layout.tsx'), /metadataBase: new URL\("https:\/\/mythirumanam\.in"\)/)
  assert.match(await read(publicPages[0][0]), /Thirukadaiyur 60th, 70th & 80th Marriage \| MyThirumanam/)
})

test('public pages have descriptions, matching canonical and Open Graph URLs, and site name', async () => {
  for (const [path, canonical] of publicPages) {
    const source = await read(path)
    assert.match(source, /description[:,]/)
    assert.ok(source.includes(`const url = '${canonical}'`))
    assert.match(source, /alternates: \{ canonical: url \}/)
    assert.match(source, /openGraph: .*url, siteName: 'MyThirumanam'/)
  }
})

test('plan remains noindex follow and is excluded from sitemap', async () => {
  const plan = await read('src/app/celebrations/thirukadaiyur/plan/page.tsx')
  assert.match(plan, /robots: \{ index: false, follow: true \}/)
  assert.equal(sitemap().some(({ url }) => url.endsWith('/plan')), false)
})

test('auth and private route groups are explicitly noindexed', async () => {
  assert.match(await read('src/app/(auth)/layout.tsx'), /robots: \{ index: false, follow: true \}/)
  assert.match(await read('src/app/(dashboard)/layout.tsx'), /robots: \{ index: false, follow: false, nocache: true \}/)
})

test('sitemap contains only canonical public product pages', () => {
  assert.deepEqual(sitemap().map(({ url }) => url), publicPages.map(([, url]) => url))
})

test('homepage and ceremonies include safe structured data without claims or pricing', async () => {
  const homepage = await read(publicPages[0][0])
  const ceremony = await read('src/components/celebrations/CeremonyPage.tsx')
  assert.match(homepage, /'@type': 'WebSite'/)
  for (const type of ['WebPage', 'Service', 'BreadcrumbList']) assert.ok(ceremony.includes(`'@type': '${type}'`))
  assert.match(ceremony, /https:\/\/mythirumanam\.in\/\$\{ceremony\.slug\}/)
  assert.doesNotMatch(`${homepage}\n${ceremony}`, /aggregateRating|Review|Offer|price|priceRange/)
})

test('JSON-LD serializer escapes markup-significant less-than characters', async () => {
  assert.match(await read('src/components/seo/JsonLd.tsx'), /replace\(\/<\/g, '\\\\u003c'\)/)
})
