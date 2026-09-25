import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { CampaignService } from '../src/modules/notifications/campaigns/campaign-service.ts'
import { DuplicateCampaignError } from '../src/modules/notifications/campaigns/campaign-types.ts'
import { blogCampaignRequestSchema } from '../src/modules/notifications/campaigns/campaign-validation.ts'

const timestamp = '2026-09-24T12:00:00.000Z'
const id = '11111111-1111-4111-8111-111111111111'
const actor = '22222222-2222-4222-8222-222222222222'
const request = (overrides = {}) => ({ blogId: id, locale: 'en', slug: 'planning-guide', title: 'Planning Guide', excerpt: 'A practical guide for families.', publicUrl: 'https://mythirumanam.in/blog/planning-guide', publishedAt: timestamp, ...overrides })

class MemoryCampaignRepository {
  records = []
  async findForSource(source) {
    return this.records.find((item) => item.sourceId === source.sourceId && item.locale === source.locale && item.campaignType === source.campaignType && item.channel === source.channel && item.sourceType === source.sourceType) ?? null
  }
  async findByIdForSource(campaignId, source) {
    return this.records.find((item) => item.id === campaignId && item.sourceId === source.sourceId && item.campaignType === source.campaignType && item.sourceType === source.sourceType && item.channel === source.channel) ?? null
  }
  async createBlogPublication(draft, now) {
    if (await this.findForSource(draft)) throw new DuplicateCampaignError('duplicate')
    const record = { ...draft, id: String(this.records.length + 1), createdAt: now, updatedAt: now }
    this.records.push(record)
    return record
  }
}

test('valid English blog campaign creates a draft email snapshot with deterministic subject', async () => {
  const repository = new MemoryCampaignRepository()
  const result = await new CampaignService(repository, () => timestamp).createBlogCampaignDraft(request(), actor)
  assert.deepEqual(result, { status: 'created', campaignId: '1' })
  assert.deepEqual(repository.records[0], {
    id: '1', campaignType: 'blog_publication', sourceType: 'blog', sourceId: id, locale: 'en', channel: 'email',
    subject: 'New Guide: Planning Guide', preheader: 'A practical guide for families.', headline: 'Planning Guide',
    summary: 'A practical guide for families.', targetUrl: 'https://mythirumanam.in/blog/planning-guide', sourcePublishedAt: timestamp, status: 'draft',
    createdBy: actor, createdAt: timestamp, updatedAt: timestamp,
  })
})

test('valid Tamil blog campaign uses the Tamil deterministic subject', async () => {
  const repository = new MemoryCampaignRepository()
  await new CampaignService(repository, () => timestamp).createBlogCampaignDraft(request({ locale: 'ta', title: 'திட்டமிடல் வழிகாட்டி', publicUrl: 'https://mythirumanam.in/ta/blog/planning-guide' }), actor)
  assert.equal(repository.records[0].subject, 'புதிய வழிகாட்டி: திட்டமிடல் வழிகாட்டி')
})

test('duplicate requests return the existing campaign without another draft', async () => {
  const repository = new MemoryCampaignRepository()
  const service = new CampaignService(repository, () => timestamp)
  await service.createBlogCampaignDraft(request(), actor)
  assert.deepEqual(await service.createBlogCampaignDraft(request(), actor), { status: 'already_exists', campaignId: '1' })
  assert.equal(repository.records.length, 1)
})

test('request validation rejects unsupported locale, invalid URL, missing title, and client-controlled fields', () => {
  assert.equal(blogCampaignRequestSchema.safeParse(request({ locale: 'fr' })).success, false)
  assert.equal(blogCampaignRequestSchema.safeParse(request({ publicUrl: 'not-a-url' })).success, false)
  assert.equal(blogCampaignRequestSchema.safeParse(request({ title: ' ' })).success, false)
  assert.equal(blogCampaignRequestSchema.safeParse(request({ status: 'completed' })).success, false)
  assert.equal(blogCampaignRequestSchema.safeParse(request({ created_by: actor })).success, false)
})

test('preheader is safely capped while target URL and source identifier remain snapshot values', async () => {
  const repository = new MemoryCampaignRepository()
  const excerpt = 'x'.repeat(500)
  await new CampaignService(repository, () => timestamp).createBlogCampaignDraft(request({ excerpt }), actor)
  assert.equal(repository.records[0].preheader.length, 160)
  assert.equal(repository.records[0].sourceId, id)
  assert.equal(repository.records[0].targetUrl, 'https://mythirumanam.in/blog/planning-guide')
})

test('migration enforces snapshot constraints, unique duplicate protection, RLS, and no Blog foreign key', () => {
  const migration = readFileSync(new URL('../supabase/migrations/add_notification_campaigns.sql', import.meta.url), 'utf8')
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.notification_campaigns/)
  assert.match(migration, /UNIQUE \(campaign_type, source_type, source_id, locale, channel\)/)
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /REVOKE ALL ON TABLE public\.notification_campaigns FROM PUBLIC, anon, authenticated/)
  assert.doesNotMatch(migration, /REFERENCES\s+.*blog_posts|FOREIGN KEY/i)
})

test('notification campaign domain has no Blog, subscriber, provider, queue, or framework dependency', () => {
  const files = ['campaign-types.ts', 'campaign-validation.ts', 'campaign-repository.ts', 'campaign-service.ts', 'blog-campaign-request.ts']
  const source = files.map((file) => readFileSync(new URL(`../src/modules/notifications/campaigns/${file}`, import.meta.url), 'utf8')).join('\n')
  assert.doesNotMatch(source, /@\/lib\/blog|@\/content\/blog|blog_posts|blog_post_translations|email_subscribers|resend|gmail|sendgrid|NextRequest|NextResponse|react/i)
})

test('Blog bridge alone depends on notification and preserves published-only/no-auto-publish behavior', () => {
  const bridge = readFileSync(new URL('../src/lib/blog/blog-notification-campaign.ts', import.meta.url), 'utf8')
  const publication = readFileSync(new URL('../src/lib/blog/admin-blog-repository.ts', import.meta.url), 'utf8')
  assert.match(bridge, /source\.status !== 'published'/)
  assert.match(bridge, /source\.locale !== 'en' && source\.locale !== 'ta'/)
  assert.match(bridge, /https:\/\/mythirumanam\.in\/blog\/\$\{source\.slug\}/)
  assert.match(bridge, /https:\/\/mythirumanam\.in\/ta\/blog\/\$\{source\.slug\}/)
  assert.match(bridge, /@\/modules\/notifications\/campaigns/)
  const publishOperation = publication.slice(publication.indexOf('export async function publishBlogTranslation'), publication.indexOf('export async function unpublishBlogTranslation'))
  assert.doesNotMatch(publishOperation, /campaign|requestPublishedBlogCampaignDraft|createAuthorizedBlogCampaignDraft/i)
})

test('authorized campaign entry point derives ownership from requireActiveAdmin, never browser identity', () => {
  const source = readFileSync(new URL('../src/modules/notifications/campaigns/campaign-authorized-service.ts', import.meta.url), 'utf8')
  assert.match(source, /requireActiveAdmin\(\)/)
  assert.match(source, /authorization\.admin\.id/)
  assert.doesNotMatch(source, /created_by|admin_id|role|permission/)
})
