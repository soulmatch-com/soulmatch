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
const sashtiapthapoorthiSlug = 'sashtiapthapoorthi-in-thirukadaiyur'
const sessionPlanningSlug = '1-session-vs-2-sessions-thirukadaiyur-60th-marriage'
const unsupportedClaims = /15\+|250\+|500\+|100% satisfaction|No\.1|Most Trusted|Best Thirukadaiyur|All-Inclusive Package|Premium Package|Gold Package|Silver Package|₹|\$[0-9]/i
const unsafeTempleWording = /Book the temple through MyThirumanam|authorized by temple|temple affiliated|direct temple contact|temple booking portal|Official Booking Number/i

test('blog content loader returns published English and Tamil articles', () => {
  const english = getPublishedBlogArticles('en')
  const tamil = getPublishedBlogArticles('ta')

  assert.equal(english.length, 3)
  assert.equal(tamil.length, 3)
  assert.deepEqual(english.map((article) => article.slug), [sessionPlanningSlug, sashtiapthapoorthiSlug, slug])
  assert.deepEqual(tamil.map((article) => article.slug), [sessionPlanningSlug, sashtiapthapoorthiSlug, slug])
  assert.ok(english.every((article) => article.status === 'published'))
  assert.ok(tamil.every((article) => article.status === 'published'))
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
  assert.ok(publishedPaths.includes('/blog/sashtiapthapoorthi-in-thirukadaiyur'))
  assert.ok(publishedPaths.includes('/ta/blog/sashtiapthapoorthi-in-thirukadaiyur'))
  assert.equal(getBlogUrl(getPublishedBlogArticle('en', slug)), 'https://mythirumanam.in/blog/60th-marriage-thirukadaiyur')
})

test('Sashtiapthapoorthi pair has approved SEO, route, product and safety content', () => {
  const english = getPublishedBlogArticle('en', sashtiapthapoorthiSlug)
  const tamil = getPublishedBlogArticle('ta', sashtiapthapoorthiSlug)
  assert.ok(english)
  assert.ok(tamil)
  assert.equal(english.title, 'Sashtiapthapoorthi in Thirukadaiyur – What Families Should Know')
  assert.equal(tamil.title, 'திருக்கடையூரில் சஷ்டியப்தபூர்த்தி – குடும்பங்கள் தெரிந்துகொள்ள வேண்டியவை')
  assert.equal(english.seoTitle, 'Sashtiapthapoorthi in Thirukadaiyur – Family Planning Guide | MyThirumanam')
  assert.equal(tamil.seoTitle, 'திருக்கடையூரில் சஷ்டியப்தபூர்த்தி – 60வது திருமண திட்டமிடல் வழிகாட்டி | MyThirumanam')
  assert.equal(getBlogPath(english), '/blog/sashtiapthapoorthi-in-thirukadaiyur')
  assert.equal(getBlogPath(tamil), '/ta/blog/sashtiapthapoorthi-in-thirukadaiyur')
  assert.deepEqual(getBlogArticleAlternates(english), {
    canonical: 'https://mythirumanam.in/blog/sashtiapthapoorthi-in-thirukadaiyur',
    languages: {
      en: 'https://mythirumanam.in/blog/sashtiapthapoorthi-in-thirukadaiyur',
      ta: 'https://mythirumanam.in/ta/blog/sashtiapthapoorthi-in-thirukadaiyur',
      'x-default': 'https://mythirumanam.in/blog/sashtiapthapoorthi-in-thirukadaiyur',
    },
  })
  const englishContent = JSON.stringify(english)
  const tamilContent = JSON.stringify(tamil)
  for (const text of ['Basic Plan', 'Pooja and Homam with 16 Kalasam', 'common/shared space', 'Premium Plan', 'private space', '1 Session or 2 Sessions', 'Transportation', 'Return Gifts', 'independent event-management and coordination service']) assert.match(englishContent, new RegExp(text))
  assert.match(tamilContent, /அடிப்படை திட்டம்/)
  assert.match(tamilContent, /பிரீமியம் திட்டம்/)
  assert.match(tamilContent, /சுயாதீன விழா ஏற்பாடு மற்றும் ஒருங்கிணைப்பு சேவை/)
  assert.doesNotMatch(englishContent + tamilContent, /Morning session only|₹|\$[0-9]|official temple website and affiliated/i)
  assert.deepEqual(english.links.map((link) => link.href), ['/60th-marriage', '/70th-marriage', '/80th-marriage', '/plan', '/blog'])
  assert.deepEqual(tamil.links.map((link) => link.href), ['/plan', '/ta/blog'])
  assert.equal(english.cta.href, '/plan')
  assert.equal(tamil.cta.href, '/plan')
})

test('today’s Sashtiapthapoorthi pair is complete, indexable and publication-ready', async () => {
  const english = getPublishedBlogArticle('en', sashtiapthapoorthiSlug)
  const tamil = getPublishedBlogArticle('ta', sashtiapthapoorthiSlug)
  assert.ok(english)
  assert.ok(tamil)
  assert.equal(english.publishedAt, '2026-09-18')
  assert.equal(tamil.publishedAt, '2026-09-18')
  assert.equal(english.updatedAt, '2026-09-18')
  assert.equal(tamil.updatedAt, '2026-09-18')
  assert.equal(english.description, 'Planning Sashtiapthapoorthi in Thirukadaiyur? Learn what families should know about the 60th marriage celebration, guest planning, sessions, food, stay, travel and celebration arrangements.')
  assert.equal(tamil.description, 'திருக்கடையூரில் சஷ்டியப்தபூர்த்தி அல்லது 60வது திருமணத்தை திட்டமிடுகிறீர்களா? விருந்தினர் எண்ணிக்கை, அமர்வுகள், உணவு, தங்குமிடம், பயணம் மற்றும் விழா ஏற்பாடுகள் குறித்து குடும்பங்கள் தெரிந்துகொள்ள வேண்டியவற்றை அறியுங்கள்.')
  assert.equal(english.title, 'Sashtiapthapoorthi in Thirukadaiyur – What Families Should Know')
  assert.equal(tamil.title, 'திருக்கடையூரில் சஷ்டியப்தபூர்த்தி – குடும்பங்கள் தெரிந்துகொள்ள வேண்டியவை')
  assert.equal(getBlogArticleAlternates(english).canonical, 'https://mythirumanam.in/blog/sashtiapthapoorthi-in-thirukadaiyur')
  assert.equal(getBlogArticleAlternates(tamil).canonical, 'https://mythirumanam.in/ta/blog/sashtiapthapoorthi-in-thirukadaiyur')
  assert.deepEqual(getBlogArticleAlternates(tamil).languages, getBlogArticleAlternates(english).languages)

  const englishBody = JSON.stringify(english)
  const tamilBody = JSON.stringify(tamil)
  for (const heading of ['What Is Sashtiapthapoorthi?', 'Why Do Families Choose Thirukadaiyur?', 'What Should Families Plan?', 'Basic Plan', 'Premium Plan', 'Optional Additional Services', 'Accommodation Planning', 'Food Arrangements', 'Photography and Videography', 'Transportation for Family Members', 'What Information Should You Have Before Making an Enquiry?', 'When Should Families Start Planning?', 'Keep Family Coordination Simple']) assert.match(englishBody, new RegExp(heading))
  for (const heading of ['சஷ்டியப்தபூர்த்தி என்றால் என்ன?', 'குடும்பங்கள் திருக்கடையூரை ஏன் தேர்வு செய்கிறார்கள்?', 'குடும்பங்கள் என்ன திட்டமிட வேண்டும்?', 'அடிப்படை திட்டம்', 'பிரீமியம் திட்டம்', 'விருப்ப கூடுதல் சேவைகள்', 'தங்குமிட திட்டமிடல்', 'உணவு ஏற்பாடுகள்', 'புகைப்படம் மற்றும் காணொளி பதிவு']) assert.match(tamilBody, new RegExp(heading))
  for (const item of ['Pooja and Homam with 16 Kalasam', 'common/shared space', 'Private hall', 'Moderate artificial flower decoration', 'Special Mangala Isai team', '1 Session or 2 Sessions', '50 guests, 100 guests or a custom guest count']) assert.match(englishBody, new RegExp(item))
  assert.match(englishBody, /Session selection is separate from the ceremony, guest count and Basic or Premium plan/)
  assert.match(englishBody, /Guest count is planning information and does not alter the Basic or Premium arrangement definitions/)
  const englishOptional = english.body[english.body.findIndex((section) => section.type === 'heading' && section.text === 'Optional Additional Services') + 1]
  const tamilOptional = tamil.body[tamil.body.findIndex((section) => section.type === 'heading' && section.text === 'விருப்ப கூடுதல் சேவைகள்') + 1]
  assert.deepEqual(englishOptional, { type: 'list', items: ['Transportation', 'Return Gifts'] })
  assert.deepEqual(tamilOptional, { type: 'list', items: ['போக்குவரத்து', 'நினைவுப் பரிசுகள்'] })
  assert.doesNotMatch(englishBody + tamilBody, /Morning Session Only|GST|advance amount|discount|per-head|₹|\$[0-9]/i)
  assert.match(englishBody, /independent event-management and coordination service/)
  assert.match(tamilBody, /சுயாதீன விழா ஏற்பாடு மற்றும் ஒருங்கிணைப்பு சேவை/)
  assert.deepEqual(english.links.map(({ href }) => href), ['/60th-marriage', '/70th-marriage', '/80th-marriage', '/plan', '/blog'])
  assert.deepEqual(tamil.links.map(({ href }) => href), ['/plan', '/ta/blog'])
  assert.equal(english.cta.secondaryLabel, '60th Marriage in Thirukadaiyur')
  assert.equal(english.cta.secondaryHref, '/60th-marriage')

  const [englishRoute, tamilRoute, englishLayout, tamilLayout, sitemapSource] = await Promise.all([
    read('src/app/(en)/blog/[slug]/page.tsx'),
    read('src/app/ta/blog/[slug]/page.tsx'),
    read('src/app/(en)/layout.tsx'),
    read('src/app/ta/layout.tsx'),
    read('src/app/sitemap.ts'),
  ])
  assert.match(englishRoute, /robots: \{ index: true, follow: true \}/)
  assert.match(tamilRoute, /robots: \{ index: true, follow: true \}/)
  assert.match(englishLayout, /RootDocument language="en"/)
  assert.match(tamilLayout, /RootDocument language="ta"/)
  assert.match(sitemapSource, /getPublishedBlogArticles\('en'\)\.map\(getBlogPath\)/)
  assert.match(sitemapSource, /getPublishedBlogArticles\('ta'\)\.map\(getBlogPath\)/)
  assert.doesNotMatch(tamilBody, /\uFFFD|à®|à¯|�/)
})

test('sitemap source derives blog URLs from published content helpers', async () => {
  const source = await read('src/app/sitemap.ts')
  assert.match(source, /getPublishedBlogArticles\('en'\)\.map\(getBlogPath\)/)
  assert.match(source, /getPublishedBlogArticles\('ta'\)\.map\(getBlogPath\)/)
  assert.match(source, /getBlogListingPath\('en'\)/)
  assert.match(source, /getBlogListingPath\('ta'\)/)
})

test('session-planning pair keeps session, guests and plans independent without religious procedure claims', async () => {
  const english = getPublishedBlogArticle('en', sessionPlanningSlug)
  const tamil = getPublishedBlogArticle('ta', sessionPlanningSlug)
  assert.ok(english)
  assert.ok(tamil)
  assert.equal(english.title, '1 Session vs 2 Sessions for a Thirukadaiyur 60th Marriage – How Families Can Plan')
  assert.equal(tamil.title, 'திருக்கடையூரில் 60வது திருமணம் – 1 அமர்வு அல்லது 2 அமர்வுகள்: குடும்பங்கள் எப்படி திட்டமிடலாம்?')
  assert.equal(english.seoTitle, '1 Session vs 2 Sessions for Thirukadaiyur 60th Marriage | MyThirumanam')
  assert.equal(tamil.seoTitle, 'திருக்கடையூர் 60வது திருமணம் – 1 அமர்வு vs 2 அமர்வுகள் | MyThirumanam')
  assert.equal(getBlogPath(english), '/blog/1-session-vs-2-sessions-thirukadaiyur-60th-marriage')
  assert.equal(getBlogPath(tamil), '/ta/blog/1-session-vs-2-sessions-thirukadaiyur-60th-marriage')
  assert.equal(getBlogArticleAlternates(english).canonical, 'https://mythirumanam.in/blog/1-session-vs-2-sessions-thirukadaiyur-60th-marriage')
  assert.equal(getBlogArticleAlternates(tamil).canonical, 'https://mythirumanam.in/ta/blog/1-session-vs-2-sessions-thirukadaiyur-60th-marriage')
  assert.deepEqual(getBlogArticleAlternates(english).languages, getBlogArticleAlternates(tamil).languages)

  const englishContent = JSON.stringify(english)
  const tamilContent = JSON.stringify(tamil)
  for (const text of ['What Does 1 Session or 2 Sessions Mean for Planning?', 'When Might a Family Consider 1 Session?', 'When Might a Family Consider 2 Sessions?', 'Does Guest Count Decide the Number of Sessions?', 'Does Basic or Premium Decide the Session?', 'Basic with 2 Sessions', 'Premium with 1 Session', 'Transportation', 'Return Gifts', 'independent event-management and coordination service']) assert.match(englishContent, new RegExp(text))
  for (const text of ['1 அமர்வு', '2 அமர்வுகள்', 'விருந்தினர் எண்ணிக்கையும் அமர்வும் தனித்தனி தேர்வுகள்', 'அடிப்படை + 2 அமர்வுகள்', 'பிரீமியம் + 1 அமர்வு', 'போக்குவரத்து', 'நினைவுப் பரிசுகள்', 'சுயாதீன விழா ஏற்பாடு மற்றும் ஒருங்கிணைப்பு சேவை']) assert.ok(tamilContent.includes(text))
  assert.doesNotMatch(englishContent + tamilContent, /Basic\s*=\s*1 Session|Premium\s*=\s*2 Sessions|100 Guests\s*=\s*2 Sessions|mandatory ceremony timing|first-day ritual|second-day ritual/i)
  assert.doesNotMatch(englishContent + tamilContent, /₹|\$[0-9]|GST|advance|discount|1-session price|2-session price/i)
  assert.deepEqual(english.links.map(({ href }) => href), ['/60th-marriage', '/plan', '/blog/sashtiapthapoorthi-in-thirukadaiyur', '/blog'])
  assert.deepEqual(tamil.links.map(({ href }) => href), ['/60th-marriage', '/plan', '/ta/blog/sashtiapthapoorthi-in-thirukadaiyur', '/ta/blog'])
  assert.equal(english.cta.href, '/plan')
  assert.equal(english.cta.secondaryHref, '/60th-marriage')
  assert.ok(english.body.some((section) => section.type === 'comparison'))
  assert.doesNotMatch(tamilContent, /\uFFFD|à®|à¯|�/)

  const [englishRoute, tamilRoute, englishLayout, tamilLayout, renderer, sitemapSource] = await Promise.all([
    read('src/app/(en)/blog/[slug]/page.tsx'), read('src/app/ta/blog/[slug]/page.tsx'), read('src/app/(en)/layout.tsx'), read('src/app/ta/layout.tsx'), read('src/components/blog/BlogArticlePage.tsx'), read('src/app/sitemap.ts'),
  ])
  assert.match(englishRoute, /robots: \{ index: true, follow: true \}/)
  assert.match(tamilRoute, /robots: \{ index: true, follow: true \}/)
  assert.match(englishLayout, /RootDocument language="en"/)
  assert.match(tamilLayout, /RootDocument language="ta"/)
  assert.match(renderer, /case 'comparison'/)
  assert.match(sitemapSource, /getPublishedBlogArticles\('en'\)\.map\(getBlogPath\)/)
  assert.match(sitemapSource, /getPublishedBlogArticles\('ta'\)\.map\(getBlogPath\)/)
})
