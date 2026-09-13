import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { businessContactLinks } from '../src/lib/business-contact.ts'
import { approvedCelebrationGalleryItems, homepageGalleryPreviewItems } from '../src/lib/celebrations/gallery.ts'
import { getBlogListingPath, getBlogPath, getPublishedBlogArticles } from '../src/content/blog/articles.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('application TypeScript config excludes Playwright from production checking', async () => {
  const [appConfig, playwrightConfig] = await Promise.all([
    read('tsconfig.json'),
    read('tsconfig.playwright.json'),
  ])
  const tsconfig = JSON.parse(appConfig)
  const e2eConfig = JSON.parse(playwrightConfig)

  assert.ok(tsconfig.exclude.includes('e2e'))
  assert.ok(tsconfig.exclude.includes('playwright.config.ts'))
  assert.equal(tsconfig.compilerOptions.strict, true)
  assert.equal(tsconfig.compilerOptions.noEmit, true)
  assert.equal(e2eConfig.extends, './tsconfig.json')
  assert.ok(e2eConfig.include.includes('playwright.config.ts'))
  assert.ok(e2eConfig.include.includes('e2e/**/*.ts'))
})

test('admin service-role endpoints require active admin authorization', async () => {
  const guardedFiles = [
    'src/app/api/admin/users/route.ts',
    'src/app/api/admin/users/[id]/route.ts',
    'src/app/api/admin/profiles/route.ts',
    'src/app/api/admin/profiles/status/route.ts',
    'src/app/api/admin/profiles/verify/route.ts',
    'src/app/api/admin/stats/route.ts',
    'src/app/api/admin/success-stories/route.ts',
    'src/app/api/admin/success-stories/[id]/route.ts',
  ]

  const helper = await read('src/lib/admin-auth.ts')
  assert.match(helper, /import 'server-only'/)
  assert.match(helper, /sessionClient\.auth\.getUser\(\)/)
  assert.match(helper, /\.from\('admins'\)/)
  assert.match(helper, /\.eq\('email', user\.email\.toLowerCase\(\)\)/)
  assert.match(helper, /\.eq\('is_active', true\)/)
  assert.match(helper, /status: 401/)
  assert.match(helper, /status: 403/)

  for (const file of guardedFiles) {
    const source = await read(file)
    assert.match(source, /requireActiveAdmin/)
    assert.match(source, /if \('response' in authorization\) return authorization\.response/)
  }
})

test('admin setup endpoint is disabled in production and has no hard-coded demo credentials', async () => {
  const source = await read('src/app/api/admin/setup/route.ts')
  assert.match(source, /NODE_ENV === 'production'/)
  assert.match(source, /Admin setup is disabled in production/)
  assert.match(source, /ADMIN_SETUP_ENABLED/)
  assert.match(source, /ADMIN_SETUP_EMAIL/)
  assert.match(source, /ADMIN_SETUP_PASSWORD/)
  assert.doesNotMatch(source, /admin@soulmatch\.com|admin123|moderator123|credentials:\s*\{/)
})

test('celebration enquiry API follows release-critical server flow', async () => {
  const source = await read('src/app/api/celebrations/enquiries/route.ts')
  assert.match(source, /checkCelebrationEnquiryRateLimit\(request\)/)
  assert.match(source, /verifyCelebrationBotChallenge/)
  assert.match(source, /MAX_REQUEST_BYTES/)
  assert.match(source, /celebrationEnquiryApiSchema\.safeParse/)
  assert.match(source, /createAdminClient\(\)/)
  assert.match(source, /persistCelebrationEnquiry/)
  assert.match(source, /await sendBookingNotification/)
  assert.ok(source.indexOf('persistCelebrationEnquiry') < source.indexOf('sendBookingNotification'))
  assert.match(source, /return NextResponse\.json\(\{ success: true, enquiryId: result\.enquiryId \}/)
  assert.doesNotMatch(source, /service_role|SUPABASE_SERVICE_ROLE_KEY|request\.json\(\)[\s\S]*console\.log/)
})

test('Turnstile and Upstash production paths fail safely when required config is missing', async () => {
  const [bot, rate, core] = await Promise.all([
    read('src/lib/celebrations/bot-verification.ts'),
    read('src/lib/celebrations/rate-limit.ts'),
    read('src/lib/celebrations/rate-limit-core.ts'),
  ])
  assert.match(bot, /TURNSTILE_SECRET_KEY/)
  assert.match(bot, /NODE_ENV !== 'production'\) return \{ status: 'valid' \}/)
  assert.match(bot, /status: 'misconfigured'/)
  assert.match(bot, /TURNSTILE_ALLOWED_HOSTNAMES/)
  assert.match(rate, /UPSTASH_REDIS_REST_URL/)
  assert.match(rate, /UPSTASH_REDIS_REST_TOKEN/)
  assert.match(rate, /CELEBRATION_RATE_LIMIT_SALT/)
  assert.match(rate, /NODE_ENV !== 'production'\) return \{ allowed: true \}/)
  assert.match(rate, /allowed: false, unavailable: true/)
  assert.match(core, /CELEBRATION_RATE_LIMIT_CAPACITY = 5/)
  assert.match(core, /CELEBRATION_RATE_LIMIT_WINDOW_MS = 10 \* 60 \* 1000/)
  assert.match(core, /createHmac\('sha256'/)
})

test('sitemap includes approved public launch routes and excludes noindex plan pages', async () => {
  const source = await read('src/app/sitemap.ts')
  const paths = ['/', '/60th-marriage', '/70th-marriage', '/80th-marriage', '/matrimony', '/about', '/gallery', '/terms', '/privacy', '/contact', getBlogListingPath('en'), ...getPublishedBlogArticles('en').map(getBlogPath), getBlogListingPath('ta'), ...getPublishedBlogArticles('ta').map(getBlogPath)]
  for (const path of ['/', '/60th-marriage', '/70th-marriage', '/80th-marriage', '/matrimony', '/about', '/gallery', '/terms', '/privacy', '/contact', '/blog', '/ta/blog']) {
    assert.ok(paths.includes(path), `${path} missing from sitemap`)
  }
  assert.match(source, /'\/privacy'/)
  assert.match(source, /'\/contact'/)
  assert.doesNotMatch(source, /'\/plan'/)
  assert.match(source, /getPublishedBlogArticles\('en'\)\.map\(getBlogPath\)/)
  assert.match(source, /getPublishedBlogArticles\('ta'\)\.map\(getBlogPath\)/)
})

test('contact and gallery launch gates remain truthful without approved assets or numbers', () => {
  assert.equal(businessContactLinks.callHref, undefined)
  assert.equal(businessContactLinks.whatsappHref, undefined)
  assert.equal(approvedCelebrationGalleryItems.length, 0)
  assert.equal(homepageGalleryPreviewItems.length, 0)
})

test('public celebration content avoids unsafe temple authority wording', async () => {
  const files = [
    'src/app/celebrations/thirukadaiyur/page.tsx',
    'src/components/celebrations/CeremonyPage.tsx',
    'src/app/gallery/page.tsx',
    'src/content/blog/articles.ts',
    'src/components/celebrations/CelebrationServices.tsx',
    'src/lib/celebrations/service-query.ts',
  ]
  const combined = (await Promise.all(files.map(read))).join('\n')
  assert.match(combined, /Temple-related Planning Assistance|temple-related planning assistance/)
  assert.match(combined, /temple_coordination/)
  assert.doesNotMatch(combined, /Call the temple|Contact Thirukadaiyur Temple|Temple WhatsApp|Official Booking Number|guaranteed temple slot|temple partnership/i)
})
