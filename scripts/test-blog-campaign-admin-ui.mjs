import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const controls = await read('src/components/admin/BlogCampaignControls.tsx')
const preview = await read('src/components/admin/BlogCampaignPreview.tsx')
const createRoute = await read('src/app/api/admin/blogs/[id]/campaigns/route.ts')
const previewRoute = await read('src/app/(en)/admin/(protected)/blogs/[id]/campaign/[campaignId]/preview/page.tsx')
const editPage = await read('src/app/(en)/admin/(protected)/blogs/[id]/edit/page.tsx')
const bridge = await read('src/lib/blog/blog-notification-campaign.ts')
const campaignService = await read('src/modules/notifications/campaigns/campaign-service.ts')
const campaignRepository = await read('src/modules/notifications/campaigns/campaign-repository.ts')

test('admin edit integration receives server-resolved English and Tamil campaign state', () => {
  assert.match(editPage, /getBlogCampaignStatus\(blog\.post\.id, 'en'\)/)
  assert.match(editPage, /getBlogCampaignStatus\(blog\.post\.id, 'ta'\)/)
  assert.match(editPage, /<BlogCampaignControls blogId=\{blog\.post\.id\}/)
  assert.doesNotMatch(editPage, /notification_campaigns/)
})

test('unavailable notification campaign storage does not break unrelated Blog administration', () => {
  assert.match(editPage, /campaignStorageAvailable = false/)
  assert.match(editPage, /available=\{campaignStorageAvailable\}/)
  assert.match(controls, /Email Campaign storage is not configured in this environment yet\./)
  assert.match(controls, /Apply the notification migrations before creating or previewing campaign drafts\./)
})

test('campaign controls offer creation only for published locales and handle missing or draft locales safely', () => {
  assert.match(controls, /translation\.status !== 'published'/)
  assert.match(controls, /Email Campaign unavailable until this translation is published\./)
  assert.match(controls, /Email Campaign unavailable until this translation is added\./)
  assert.match(controls, /Create Campaign Draft/)
  assert.match(controls, /row\('en', english\)/)
  assert.match(controls, /row\('ta', tamil\)/)
})

test('campaign creation browser request contains locale only, prevents duplicate clicks, and refreshes state', () => {
  assert.match(controls, /if \(loadingLocale\) return/)
  assert.match(controls, /disabled=\{loading\}/)
  assert.match(controls, /fetch\(`\/api\/admin\/blogs\/\$\{blogId\}\/campaigns`/)
  assert.match(controls, /JSON\.stringify\(\{ locale \}\)/)
  assert.match(controls, /router\.refresh\(\)/)
  assert.doesNotMatch(controls, /JSON\.stringify\([^)]*(?:subject|status|sourceId|createdBy|headline|targetUrl)/)
})

test('created and already-existing responses both resolve to a draft preview state', () => {
  assert.match(controls, /result\.campaignId/)
  assert.match(controls, /status: 'draft'/)
  assert.match(controls, /Preview Campaign/)
  assert.match(controls, /Status: \{statusLabel\(campaign\.status\)\}/)
})

test('server creation route requires active admin and derives trusted Blog content from locale only', () => {
  assert.match(createRoute, /requireActiveAdmin\(\)/)
  assert.match(createRoute, /blogIdSchema\.parse\(id\)/)
  assert.match(createRoute, /blogLocaleSchema\.parse\(body\?\.locale\)/)
  assert.match(createRoute, /createBlogCampaignDraftFromPublication\(blogId, locale\)/)
  assert.doesNotMatch(createRoute, /body\?\.(?:title|subject|headline|summary|publicUrl|publishedAt|sourceId|status|createdBy)/)
})

test('Blog bridge loads and validates the requested published locale before invoking notification creation', () => {
  assert.match(bridge, /getAdminBlogById\(blogId\)/)
  assert.match(bridge, /const translation = locale === 'en' \? blog\.english : blog\.tamil/)
  assert.match(bridge, /if \(!translation\) throw new Error\('Blog translation not found\.'\)/)
  assert.match(bridge, /requestPublishedBlogCampaignDraft\(/)
  assert.match(bridge, /https:\/\/mythirumanam\.in\/blog\/\$\{source\.slug\}/)
  assert.match(bridge, /https:\/\/mythirumanam\.in\/ta\/blog\/\$\{source\.slug\}/)
})

test('preview is protected, noindex, source-owned, and reads stored notification snapshot', () => {
  assert.match(previewRoute, /requireActiveAdmin\(\)/)
  assert.match(previewRoute, /robots: \{ index: false, follow: false \}/)
  assert.match(previewRoute, /getBlogCampaignPreview\(id, campaignId\)/)
  assert.match(bridge, /getAuthorizedCampaignPreview\(campaignId, \{ campaignType: 'blog_publication', sourceType: 'blog', sourceId: blogId, channel: 'email' \}\)/)
  assert.match(campaignRepository, /findByIdForSource\(campaignId/)
  assert.match(campaignRepository, /\.eq\('source_id', source\.sourceId\)/)
  assert.doesNotMatch(previewRoute, /getAdminBlogById|article\.title|article\.excerpt/)
})

test('English and Tamil provider-independent preview copy shows snapshot subject, preheader, and CTAs', () => {
  for (const text of ['New Guide', 'Read the Full Guide', 'Plan Your Thirukadaiyur Celebration', 'Independent celebration planning and coordination service.', 'புதிய வழிகாட்டி', 'முழு வழிகாட்டியை படிக்கவும்', 'உங்கள் திருக்கடையூர் விழாவை திட்டமிடுங்கள்']) assert.match(preview, new RegExp(text))
  assert.match(preview, /campaign\.subject/)
  assert.match(preview, /campaign\.preheader/)
  assert.match(preview, /campaign\.headline/)
  assert.match(preview, /campaign\.summary/)
  assert.match(preview, /href=\{campaign\.targetUrl\}/)
})

test('admin campaign UI exposes no recipient lookup, provider, queue, or active send action', () => {
  const source = [controls, preview, createRoute, previewRoute, campaignService].join('\n')
  assert.doesNotMatch(source, /email_subscribers|recipient_count|resend|gmail|sendgrid|notification_jobs|enqueue|queue\.add/i)
  assert.doesNotMatch(source, /Send Campaign/)
  assert.match(controls, /Recipients will be determined when the campaign is queued\./)
  assert.match(controls, /Campaign sending is not enabled yet\./)
})
