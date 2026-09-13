import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import sitemap from '../src/app/sitemap.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('About route renders the expected primary content', async () => {
  const source = await read('src/app/about/page.tsx')
  assert.match(source, /<h1[^>]*>About MyThirumanam<\/h1>/)
  assert.match(source, /Celebrations Made Meaningful/)
  assert.match(source, /A Special Place for Marriage Milestones/)
})

test('About reuses canonical ceremony configuration and links', async () => {
  const source = await read('src/app/about/page.tsx')
  assert.match(source, /<CeremonyGrid \/>/)
  const grid = await read('src/components/celebrations/CeremonyGrid.tsx')
  assert.match(grid, /href=\{`\/\$\{ceremony\.slug\}`\}/)
})

test('About planning actions use canonical routes', async () => {
  const source = await read('src/app/about/page.tsx')
  assert.match(source, /href="\/plan"/)
  assert.match(source, /href="\/"/)
})

test('About services use the server loader and no hard-coded fallback', async () => {
  const source = await read('src/app/about/page.tsx')
  assert.match(source, /await loadCelebrationServices\(\)/)
  assert.match(source, /<CelebrationServices services=\{services\} \/>/)
  assert.match(source, /Available services could not be loaded right now/)
  assert.doesNotMatch(source, /requestableServices|serviceOptions|celebrationServices|Vadhyar \/ Priest/)
})

test('About metadata and AboutPage JSON-LD are canonical', async () => {
  const source = await read('src/app/about/page.tsx')
  assert.match(source, /const url = 'https:\/\/mythirumanam\.in\/about'/)
  assert.match(source, /alternates: \{ canonical: url \}/)
  assert.match(source, /siteName: 'MyThirumanam'/)
  assert.match(source, /'@type': 'AboutPage'/)
})

test('About is present in sitemap and plan remains excluded', () => {
  const urls = sitemap().map(({ url }) => url)
  assert.ok(urls.includes('https://mythirumanam.in/about'))
  assert.equal(urls.includes('https://mythirumanam.in/plan'), false)
})

test('About contains Tamil language semantics and no unsupported claims', async () => {
  const source = await read('src/app/about/page.tsx')
  assert.ok((source.match(/lang="ta"/g) ?? []).length >= 6)
  assert.doesNotMatch(source, /No\.1|Most Trusted|100% Guaranteed|100% Verified|Thousands of Ceremonies|Years of Experience/i)
})

test('footer provides the About Us navigation entry', async () => {
  const source = await read('src/components/SiteFooter.tsx')
  assert.match(source, /\['About Us', '\/about'\]/)
  assert.match(source, /heading="Company"/)
})

test('About receives the shared header and footer without local duplicates', async () => {
  const [page, layout, header, conditionalHeader, conditionalFooter] = await Promise.all([
    read('src/app/about/page.tsx'),
    read('src/app/layout.tsx'),
    read('src/components/Header.tsx'),
    read('src/components/ConditionalHeader.tsx'),
    read('src/components/ConditionalFooter.tsx'),
  ])
  assert.doesNotMatch(page, /<header|<nav|<SiteFooter|<Header/)
  assert.match(layout, /<ConditionalHeader \/>/)
  assert.match(layout, /<ConditionalFooter \/>/)
  assert.match(conditionalHeader, /return <Header \/>/)
  assert.match(conditionalFooter, /return <SiteFooter \/>/)
  assert.match(header, /pathname === '\/about'/)
  assert.match(header, /mythirumanam-logo\.png/)
})

test('About reuses existing Celebration icon renderers', async () => {
  const [page, services, planning] = await Promise.all([
    read('src/app/about/page.tsx'),
    read('src/components/celebrations/CelebrationServices.tsx'),
    read('src/components/celebrations/PlanningSteps.tsx'),
  ])
  assert.match(page, /<PlanningSteps steps=\{steps\} \/>/)
  assert.match(page, /<CelebrationServices services=\{services\} \/>/)
  assert.match(services, /getCelebrationServiceIcon\(service\.icon\)/)
  assert.match(services, /\|\| CircleEllipsis/)
  assert.match(planning, /aria-hidden="true"/)
  for (const icon of ['HeartHandshake', 'ScrollText', 'SlidersHorizontal', 'MessageCircle']) assert.match(page, new RegExp(icon))
})
