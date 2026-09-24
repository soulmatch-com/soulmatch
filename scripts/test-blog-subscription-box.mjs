import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const component = await read('src/components/blog/BlogSubscriptionBox.tsx')
const listing = await read('src/components/blog/BlogListing.tsx')
const article = await read('src/components/blog/BlogArticlePage.tsx')
const cmsArticle = await read('src/components/blog/CmsBlogArticlePage.tsx')
const route = await read('src/app/api/notifications/subscribers/route.ts')
const tamilListing = await read('src/app/ta/blog/page.tsx')
const englishListing = await read('src/app/(en)/blog/page.tsx')

test('English and Tamil subscription copy is defined locally and safely', () => {
  for (const value of [
    'Get Thirukadaiyur Planning Guides',
    'Receive new celebration guides, checklists and practical planning tips by email.',
    'புதிய திருக்கடையூர் வழிகாட்டிகளை பெறுங்கள்',
    'விழா திட்டமிடல் குறிப்புகள், checklist மற்றும் புதிய வழிகாட்டிகளை மின்னஞ்சலில் பெறுங்கள்.',
  ]) assert.match(component, new RegExp(value))
  assert.doesNotMatch(component, /navigator\.language|window\.location/)
})

test('listing and article placements supply fixed locale and source mappings', () => {
  assert.match(listing, /<BlogSubscriptionBox locale=\{locale\} source="blog_listing" \/>/)
  assert.match(article, /<BlogSubscriptionBox locale=\{article\.locale\} source="blog_article" \/>/)
  assert.match(cmsArticle, /<BlogSubscriptionBox locale=\{article\.locale\} source="blog_article" \/>/)
  assert.match(englishListing, /<BlogListing locale="en" articles=\{articles\} \/>/)
  assert.match(tamilListing, /<BlogListing locale="ta" articles=\{articles\} \/>/)
})

test('form requires explicit consent, validates email, and blocks duplicate submission', () => {
  assert.match(component, /const \[consent, setConsent\] = useState\(false\)/)
  assert.match(component, /type="checkbox"/)
  assert.match(component, /if \(submittingRef\.current\) return/)
  assert.match(component, /disabled=\{state === 'submitting'\}/)
  assert.match(component, /maxLength=\{320\}/)
  assert.match(component, /validateEmail\(email, text\)/)
})

test('only the subscriber API payload is submitted and safe outcomes are handled', () => {
  assert.match(component, /fetch\('\/api\/notifications\/subscribers'/)
  assert.match(component, /JSON\.stringify\(\{ email: email\.trim\(\), consent: true, locale, source \}\)/)
  for (const status of ['subscribed', 'already_subscribed', 'resubscribed']) assert.match(component, new RegExp(`status === '${status}'`))
  assert.match(component, /response\.status === 429 \? text\.rateLimitError : text\.genericError/)
  assert.doesNotMatch(component, /subscriberId|subscriber_id|resend|sendgrid|postmark|queue|campaign/i)
})

test('subscriber route rate limits before parsing and does not call providers or campaigns', () => {
  assert.ok(route.indexOf('checkSubscriberRateLimit(request)') < route.indexOf('request.text()'))
  assert.match(route, /status: 429/)
  assert.doesNotMatch(route, /resend|sendgrid|postmark|gmail|queue|campaign/i)
})

test('subscription UI remains independent of CMS repositories', () => {
  assert.doesNotMatch(component, /blog_posts|blog_post_translations|public-blog-repository|CMS/i)
  assert.match(cmsArticle, /<MarkdownArticle content=\{article\.content\} \/>/)
})
