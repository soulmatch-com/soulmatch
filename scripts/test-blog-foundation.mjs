import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  blogArticles,
  getBlogArticleByTranslationKey,
  getBlogArticleAlternates,
  getBlogListingPath,
  getBlogPath,
  getBlogUrl,
  getPublishedBlogArticle,
  getPublishedBlogArticles,
} from '../src/content/blog/articles.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const slug = '60th-marriage-thirukadaiyur'
const unsupportedClaims = /15\+|250\+|500\+|100% satisfaction|No\.1|Most Trusted|Best Thirukadaiyur|All-Inclusive Package|Premium Package|Gold Package|Silver Package|₹|\$[0-9]/i
const unsafeTempleWording = /Book the temple through MyThirumanam|authorized by temple|temple affiliated|direct temple contact|temple booking portal|Official Booking Number/i

test('blog content loader returns only published English and Tamil articles', () => {
  const english = getPublishedBlogArticles('en')
  const tamil = getPublishedBlogArticles('ta')

  assert.equal(english.length, 1)
  assert.equal(tamil.length, 1)
  assert.equal(english[0].slug, slug)
  assert.equal(tamil[0].slug, slug)
  assert.equal(english[0].status, 'published')
  assert.equal(tamil[0].status, 'published')
  assert.equal(getPublishedBlogArticle('en', slug)?.title, '60th Marriage in Thirukadaiyur: A Complete Planning Guide')
  assert.equal(getPublishedBlogArticle('ta', slug)?.title, 'திருக்கடையூரில் 60ஆம் திருமணம்: முழுமையான திட்டமிடல் வழிகாட்டி')
})

test('English and Tamil article pair shares translationKey and language switch target', () => {
  const english = getPublishedBlogArticle('en', slug)
  const tamil = getPublishedBlogArticle('ta', slug)
  assert.ok(english)
  assert.ok(tamil)
  assert.equal(english.translationKey, '60th-marriage-thirukadaiyur')
  assert.equal(tamil.translationKey, english.translationKey)
  assert.equal(getBlogArticleByTranslationKey('ta', english.translationKey), tamil)
  assert.equal(getBlogArticleByTranslationKey('en', tamil.translationKey), english)
  assert.equal(getBlogPath(english), '/blog/60th-marriage-thirukadaiyur')
  assert.equal(getBlogPath(tamil), '/ta/blog/60th-marriage-thirukadaiyur')
})

test('listing and article routes have self-canonicals, reciprocal hreflang and x-default', async () => {
  const [englishList, tamilList, englishArticle, tamilArticle] = await Promise.all([
    read('src/app/(en)/blog/page.tsx'),
    read('src/app/ta/blog/page.tsx'),
    read('src/app/(en)/blog/[slug]/page.tsx'),
    read('src/app/ta/blog/[slug]/page.tsx'),
  ])

  assert.match(englishList, /const url = getBlogListingUrl\('en'\)/)
  assert.match(tamilList, /const url = getBlogListingUrl\('ta'\)/)
  assert.match(englishList, /languages: \{ en: url, ta: tamilUrl, 'x-default': url \}/)
  assert.match(tamilList, /languages: \{ en: englishUrl, ta: url, 'x-default': englishUrl \}/)
  assert.match(englishArticle, /alternates: getBlogArticleAlternates\(article\)/)
  assert.match(tamilArticle, /alternates: getBlogArticleAlternates\(article\)/)

  const english = getPublishedBlogArticle('en', slug)
  const tamil = getPublishedBlogArticle('ta', slug)
  assert.ok(english)
  assert.ok(tamil)
  assert.deepEqual(getBlogArticleAlternates(english), {
    canonical: 'https://mythirumanam.in/blog/60th-marriage-thirukadaiyur',
    languages: {
      en: 'https://mythirumanam.in/blog/60th-marriage-thirukadaiyur',
      ta: 'https://mythirumanam.in/ta/blog/60th-marriage-thirukadaiyur',
      'x-default': 'https://mythirumanam.in/blog/60th-marriage-thirukadaiyur',
    },
  })
  assert.deepEqual(getBlogArticleAlternates(tamil).languages, getBlogArticleAlternates(english).languages)
})

test('Article and BreadcrumbList structured data are language and URL accurate', async () => {
  const [englishArticle, tamilArticle] = await Promise.all([
    read('src/app/(en)/blog/[slug]/page.tsx'),
    read('src/app/ta/blog/[slug]/page.tsx'),
  ])

  assert.match(englishArticle, /'@type': 'Article'/)
  assert.match(englishArticle, /inLanguage: 'en'/)
  assert.match(englishArticle, /'@type': 'BreadcrumbList'/)
  assert.match(englishArticle, /item: 'https:\/\/mythirumanam\.in\/blog'/)
  assert.match(tamilArticle, /'@type': 'Article'/)
  assert.match(tamilArticle, /inLanguage: 'ta'/)
  assert.match(tamilArticle, /'@type': 'BreadcrumbList'/)
  assert.match(tamilArticle, /item: 'https:\/\/mythirumanam\.in\/ta\/blog'/)
  assert.doesNotMatch(englishArticle + tamilArticle, /FAQPage|AggregateRating|Review|Offer/)
})

test('articles link to ceremony, planning and blog routes without invented Tamil product routes', () => {
  const english = getPublishedBlogArticle('en', slug)
  const tamil = getPublishedBlogArticle('ta', slug)
  assert.ok(english)
  assert.ok(tamil)
  assert.deepEqual(english.links.map((link) => link.href), ['/60th-marriage', '/plan', '/blog'])
  assert.deepEqual(tamil.links.map((link) => link.href), ['/60th-marriage', '/plan', '/ta/blog'])
  assert.equal(english.cta.href, '/plan')
  assert.equal(tamil.cta.href, '/plan')
  assert.doesNotMatch(JSON.stringify(tamil), /\/ta\/60th-marriage|\/ta\/plan/)
})

test('religious content is careful and preserves family and Vadhyar variation', () => {
  const english = JSON.stringify(getPublishedBlogArticle('en', slug))
  const tamil = JSON.stringify(getPublishedBlogArticle('ta', slug))

  assert.match(english, /Some families may observe Ugraratha Shanthi/)
  assert.match(english, /Sashtiapthapoorthi/)
  assert.match(english, /may vary according to family tradition, community practices and Vadhyar or priest guidance/)
  assert.match(tamil, /உக்ரரத சாந்தி/)
  assert.match(tamil, /ஷஷ்டியப்த பூர்த்தி/)
  assert.match(tamil, /குடும்ப சம்பிரதாயம், சமூக மரபுகள் மற்றும் வாத்தியார் \/ புரோகிதர் வழிகாட்டுதலின்படி மாறுபடலாம்/)
  assert.doesNotMatch(english + tamil, /must always|universal rule|guaranteed auspicious/i)
})

test('blog content avoids unsupported packages, pricing, trust claims, external images and unsafe temple wording', async () => {
  const files = [
    'src/content/blog/articles.ts',
    'src/app/(en)/blog/page.tsx',
    'src/app/ta/blog/page.tsx',
    'src/app/(en)/blog/[slug]/page.tsx',
    'src/app/ta/blog/[slug]/page.tsx',
    'src/components/blog/BlogArticlePage.tsx',
    'src/components/blog/BlogListing.tsx',
  ]
  const combined = (await Promise.all(files.map(read))).join('\n')
  assert.doesNotMatch(combined, unsupportedClaims)
  assert.doesNotMatch(combined, unsafeTempleWording)
  assert.doesNotMatch(combined, /iraivi|googleusercontent|unsplash|pexels|pixabay|stock photo|http:\/\/|https:\/\/(?!schema\.org|mythirumanam\.in)/i)
  assert.doesNotMatch(combined, /heroImage|image:\s*\{|\.jpg|\.jpeg|\.webp/)
})

test('Tamil content is valid Unicode with no mojibake', () => {
  const tamil = getPublishedBlogArticle('ta', slug)
  assert.ok(tamil)
  const source = JSON.stringify(tamil)
  assert.match(source, /திருக்கடையூரில் 60ஆம் திருமணம்/)
  assert.match(source, /விழாவை திட்டமிடுங்கள்/)
  assert.doesNotMatch(source, /\uFFFD|à®|à¯|�/)
})

test('only published articles enter sitemap and blog listings', () => {
  const publishedPaths = [
    getBlogListingPath('en'),
    ...getPublishedBlogArticles('en').map(getBlogPath),
    getBlogListingPath('ta'),
    ...getPublishedBlogArticles('ta').map(getBlogPath),
  ]
  assert.ok(publishedPaths.includes('/blog'))
  assert.ok(publishedPaths.includes('/blog/60th-marriage-thirukadaiyur'))
  assert.ok(publishedPaths.includes('/ta/blog'))
  assert.ok(publishedPaths.includes('/ta/blog/60th-marriage-thirukadaiyur'))
  for (const article of blogArticles) {
    if (article.status !== 'published') {
      assert.equal(getPublishedBlogArticles(article.locale).includes(article), false)
      assert.equal(publishedPaths.includes(getBlogPath(article)), false)
    }
  }
  assert.equal(getBlogListingPath('en'), '/blog')
  assert.equal(getBlogListingPath('ta'), '/ta/blog')
  assert.equal(getBlogUrl(getPublishedBlogArticles('en')[0]), 'https://mythirumanam.in/blog/60th-marriage-thirukadaiyur')
})

test('sitemap source derives blog URLs from published content helpers', async () => {
  const source = await read('src/app/sitemap.ts')
  assert.match(source, /getPublishedBlogArticles\('en'\)\.map\(getBlogPath\)/)
  assert.match(source, /getPublishedBlogArticles\('ta'\)\.map\(getBlogPath\)/)
  assert.match(source, /getBlogListingPath\('en'\)/)
  assert.match(source, /getBlogListingPath\('ta'\)/)
})
