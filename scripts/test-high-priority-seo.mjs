import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import robots from '../src/app/robots.ts'
import sitemap from '../src/app/sitemap.ts'
import {
  getBlogArticleAlternates,
  getBlogUrl,
  getPublishedBlogArticle,
} from '../src/content/blog/articles.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const slug = '60th-marriage-thirukadaiyur'
const englishUrl = 'https://mythirumanam.in/blog/60th-marriage-thirukadaiyur'
const tamilUrl = 'https://mythirumanam.in/ta/blog/60th-marriage-thirukadaiyur'

function assertAbsoluteHttps(url) {
  const parsed = new URL(url)
  assert.equal(parsed.protocol, 'https:')
  assert.equal(parsed.hostname, 'mythirumanam.in')
}

test('English and Tamil route groups render distinct root document languages', async () => {
  const [englishLayout, tamilLayout, rootDocument] = await Promise.all([
    read('src/app/(en)/layout.tsx'),
    read('src/app/ta/layout.tsx'),
    read('src/app/root-document.tsx'),
  ])

  assert.match(rootDocument, /<html lang=\{language\}>/)
  assert.match(englishLayout, /<RootDocument language="en">/)
  assert.match(tamilLayout, /<RootDocument language="ta">/)
})

test('English and Tamil 60th blog articles advertise reciprocal absolute hreflang URLs', () => {
  const english = getPublishedBlogArticle('en', slug)
  const tamil = getPublishedBlogArticle('ta', slug)
  assert.ok(english)
  assert.ok(tamil)

  const englishAlternates = getBlogArticleAlternates(english)
  const tamilAlternates = getBlogArticleAlternates(tamil)

  assert.equal(englishAlternates.canonical, englishUrl)
  assert.equal(tamilAlternates.canonical, tamilUrl)
  assert.deepEqual(englishAlternates.languages, {
    en: englishUrl,
    ta: tamilUrl,
    'x-default': englishUrl,
  })
  assert.deepEqual(tamilAlternates.languages, englishAlternates.languages)

  for (const url of [
    englishAlternates.canonical,
    tamilAlternates.canonical,
    ...Object.values(englishAlternates.languages),
  ]) {
    assertAbsoluteHttps(url)
  }
})

test('article metadata pages use the shared blog alternate helper', async () => {
  const [englishArticle, tamilArticle] = await Promise.all([
    read('src/app/(en)/blog/[slug]/page.tsx'),
    read('src/app/ta/blog/[slug]/page.tsx'),
  ])

  assert.match(englishArticle, /alternates: getBlogArticleAlternates\(article\)/)
  assert.match(tamilArticle, /alternates: getBlogArticleAlternates\(article\)/)
  assert.equal(getBlogUrl(getPublishedBlogArticle('en', slug)), englishUrl)
  assert.equal(getBlogUrl(getPublishedBlogArticle('ta', slug)), tamilUrl)
})

test('contact page has one canonical Metadata API source', async () => {
  const contact = await read('src/app/(en)/contact/page.tsx')
  assert.match(contact, /const url = 'https:\/\/mythirumanam\.in\/contact'/)
  assert.match(contact, /alternates: \{ canonical: url \}/)
  assert.equal((contact.match(/canonical/g) ?? []).length, 1)
})

test('homepage has the intended single H1 source and preferred metadata', async () => {
  const homepage = await read('src/app/(en)/celebrations/thirukadaiyur/page.tsx')
  const h1Matches = homepage.match(/<h1\b/g) ?? []

  assert.equal(h1Matches.length, 1)
  assert.match(homepage, /Thirukadaiyur 60th, 70th &amp; 80th Marriage Celebrations/)
  assert.match(homepage, /Celebrate Life&apos;s Meaningful Marriage Milestones/)
  assert.match(homepage, /title: 'Thirukadaiyur 60th, 70th & 80th Marriage \| MyThirumanam'/)
  assert.match(homepage, /Plan your 60th, 70th or 80th marriage celebration in Thirukadaiyur\. Get help with priest, pooja, hall, catering, stay, transport, photography and complete arrangements\./)
})

test('plan noindex, sitemap and robots SEO behavior is preserved', async () => {
  const plan = await read('src/app/(en)/celebrations/thirukadaiyur/plan/page.tsx')
  const sitemapUrls = sitemap().map(({ url }) => url)
  const robotsConfig = robots()

  assert.match(plan, /robots: \{ index: false, follow: true \}/)
  assert.equal(sitemapUrls.includes('https://mythirumanam.in/plan'), false)
  assert.ok(sitemapUrls.includes(englishUrl))
  assert.ok(sitemapUrls.includes(tamilUrl))
  assert.equal(robotsConfig.sitemap, 'https://mythirumanam.in/sitemap.xml')
  assert.deepEqual(robotsConfig.rules.allow, ['/'])
  assert.ok(!JSON.stringify(robotsConfig).includes('noindex'))
})

test('Tamil UTF-8 blog content remains valid', () => {
  const tamil = getPublishedBlogArticle('ta', slug)
  assert.ok(tamil)
  const source = JSON.stringify(tamil)

  assert.match(source, /திருக்கடையூரில் 60ஆம் திருமணம்/)
  assert.match(source, /விழாவை திட்டமிடுங்கள்/)
  assert.doesNotMatch(source, /\uFFFD|à®|à¯|�/)
})
