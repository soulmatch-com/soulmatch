import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createUnsubscribeToken, verifyUnsubscribeToken } from '../src/modules/notifications/unsubscribe/unsubscribe-token.ts'
import { UnsubscribeService } from '../src/modules/notifications/unsubscribe/unsubscribe-service.ts'
import { NotificationWorker } from '../src/modules/notifications/workers/notification-worker.ts'

const subscriberId = '11111111-1111-4111-8111-111111111111'
const campaignId = '22222222-2222-4222-8222-222222222222'
const secret = 'test-only-unsubscribe-secret'
const timestamp = '2026-09-24T12:00:00.000Z'

class MemorySubscribers {
  constructor(status = 'subscribed') { this.record = { id: subscriberId, status, unsubscribedAt: null }; this.calls = 0 }
  async findById(id) { return id === subscriberId ? this.record : null }
  async unsubscribe(id, now) { this.calls += 1; this.record.status = 'unsubscribed'; this.record.unsubscribedAt = now }
}

test('HMAC unsubscribe token verifies only the signed subscriber ID and exposes no email', () => {
  const token = createUnsubscribeToken(subscriberId, secret)
  assert.deepEqual(verifyUnsubscribeToken(token, secret), { subscriberId })
  assert.doesNotMatch(token, /@|example\.com|blog_listing/i)
  assert.equal(verifyUnsubscribeToken(token.replace(subscriberId, '33333333-3333-4333-8333-333333333333'), secret), null)
  assert.equal(verifyUnsubscribeToken(`${token}x`, secret), null)
  assert.equal(verifyUnsubscribeToken(token.replace('v1.', 'v2.'), secret), null)
  assert.equal(verifyUnsubscribeToken(token, 'wrong-secret'), null)
  assert.equal(verifyUnsubscribeToken('bad-token', secret), null)
})

test('unsubscribe service mutates only on valid POST service call and remains idempotent', async () => {
  const repository = new MemorySubscribers()
  const service = new UnsubscribeService(repository, () => timestamp)
  const token = createUnsubscribeToken(subscriberId, secret)
  const originalSecret = process.env.NOTIFICATION_UNSUBSCRIBE_SECRET
  process.env.NOTIFICATION_UNSUBSCRIBE_SECRET = secret
  try {
    assert.deepEqual(await service.unsubscribe(token), { status: 'unsubscribed' })
    assert.equal(repository.record.status, 'unsubscribed')
    assert.equal(repository.record.unsubscribedAt, timestamp)
    assert.deepEqual(await service.unsubscribe(token), { status: 'unsubscribed' })
    assert.equal(repository.calls, 1)
    assert.deepEqual(await service.unsubscribe('invalid'), { status: 'invalid' })
    assert.equal(repository.calls, 1)
  } finally {
    if (originalSecret === undefined) delete process.env.NOTIFICATION_UNSUBSCRIBE_SECRET
    else process.env.NOTIFICATION_UNSUBSCRIBE_SECRET = originalSecret
  }
})

test('public unsubscribe GET page validates only and never performs a mutation', () => {
  const page = readFileSync(new URL('../src/app/(en)/unsubscribe/page.tsx', import.meta.url), 'utf8')
  assert.match(page, /verifyUnsubscribeToken\(token\)/)
  assert.doesNotMatch(page, /UnsubscribeService|\.unsubscribe\(|fetch\(/)
  assert.doesNotMatch(page, /valid\.subscriberId|unsubscribed_at/)
})

test('unsubscribe POST accepts only a signed token and never browser identity fields', () => {
  const route = readFileSync(new URL('../src/app/api/notifications/unsubscribe/route.ts', import.meta.url), 'utf8')
  assert.match(route, /content-type.*application\/json/)
  assert.match(route, /new UnsubscribeService\(new SupabaseSubscriberRepository\(\)\)\.unsubscribe\(token\)/)
  assert.doesNotMatch(route, /body\?\.(?:email|subscriberId|status|unsubscribedAt)/)
  assert.doesNotMatch(route, /console\.(?:log|error)/)
})

test('suppression migration is private, bounded, and queue eligibility excludes active suppression', () => {
  const migration = readFileSync(new URL('../supabase/migrations/add_email_suppressions.sql', import.meta.url), 'utf8')
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.email_suppressions/)
  assert.match(migration, /REFERENCES public\.email_subscribers\(id\)/)
  assert.match(migration, /reason IN \('bounce', 'complaint', 'provider_suppression', 'manual_admin'\)/)
  assert.match(migration, /source IN \('provider', 'admin', 'system'\)/)
  assert.match(migration, /UNIQUE INDEX.*email_suppressions_one_active_per_subscriber/s)
  assert.match(migration, /WHERE released_at IS NULL/)
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /REVOKE ALL ON TABLE public\.email_suppressions FROM PUBLIC, anon, authenticated/)
  assert.match(migration, /NOT EXISTS \(SELECT 1 FROM public\.email_suppressions AS suppression/)
})

test('worker skips an actively suppressed subscriber without provider delivery', async () => {
  const outcomes = []
  const repository = {
    async claimJobs() { return [{ id: 'job-1', campaignId, subscriberId, channel: 'email', attemptCount: 0 }] },
    async getCampaign() { return { id: campaignId, campaignType: 'blog_publication', locale: 'en', channel: 'email', status: 'queued', subject: 'New Guide', preheader: null, headline: 'Guide', summary: null, targetUrl: 'https://mythirumanam.in/blog/guide' } },
    async getSubscriber() { return { id: subscriberId, email: 'person@example.com', preferredLocale: 'en', status: 'subscribed' } },
    async recordOutcome(id, outcome) { outcomes.push({ id, ...outcome }) },
  }
  const provider = { calls: 0, async send() { this.calls += 1; return { status: 'accepted', providerMessageId: 'unexpected' } } }
  await new NotificationWorker(repository, provider, { async resolve() { return 'https://example.test/unsubscribe' } }, { async hasActiveSuppression() { return true } }, () => new Date(timestamp)).processNotificationBatch()
  assert.equal(provider.calls, 0)
  assert.deepEqual(outcomes[0], { id: 'job-1', status: 'skipped', attemptCount: 0, errorCode: 'subscriber_suppressed' })
})

test('notification modules remain Blog-independent and no public worker trigger or admin send action exists', () => {
  const files = [
    'src/modules/notifications/unsubscribe/unsubscribe-token.ts',
    'src/modules/notifications/unsubscribe/unsubscribe-service.ts',
    'src/modules/notifications/suppressions/suppression-repository.ts',
    'src/modules/notifications/workers/notification-worker.ts',
  ]
  const source = files.map((path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')).join('\n')
  assert.doesNotMatch(source, /@\/lib\/blog|@\/content\/blog|blog_posts|blog_post_translations/i)
  assert.doesNotMatch(readFileSync(new URL('../src/components/admin/BlogCampaignControls.tsx', import.meta.url), 'utf8'), /Queue Campaign|Send Campaign/)
  assert.doesNotMatch(source, /NextRequest|NextResponse|setInterval|cron|scheduler/)
})

test('suppression verifier is read-only and unsubscribe secret remains server-only configuration', () => {
  const verifier = readFileSync(new URL('../supabase/migrations/verify_email_suppressions.sql', import.meta.url), 'utf8')
  const env = readFileSync(new URL('../.env.example', import.meta.url), 'utf8')
  assert.match(verifier, /email_suppressions/)
  assert.doesNotMatch(verifier, /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i)
  assert.match(env, /NOTIFICATION_UNSUBSCRIBE_SECRET=/)
  assert.doesNotMatch(env, /NEXT_PUBLIC_NOTIFICATION_UNSUBSCRIBE_SECRET/)
})
