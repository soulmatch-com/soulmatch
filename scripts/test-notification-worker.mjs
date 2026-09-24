import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { NotificationWorker } from '../src/modules/notifications/workers/notification-worker.ts'
import { MAX_NOTIFICATION_ATTEMPTS, getRetryDelayMs, shouldRetry } from '../src/modules/notifications/workers/retry-policy.ts'
import { renderBlogPublicationEmail } from '../src/modules/notifications/templates/blog-email-template.ts'
import { ResendEmailProvider } from '../src/modules/notifications/providers/resend-email-provider.ts'

const campaignId = '11111111-1111-4111-8111-111111111111'
const jobId = '22222222-2222-4222-8222-222222222222'
const subscriberId = '33333333-3333-4333-8333-333333333333'
const now = new Date('2026-09-24T12:00:00.000Z')

const campaign = (overrides = {}) => ({ id: campaignId, campaignType: 'blog_publication', locale: 'en', channel: 'email', status: 'queued', subject: 'New Guide: Planning', preheader: 'Helpful guide', headline: 'Planning Guide', summary: 'Practical information for families.', targetUrl: 'https://mythirumanam.in/blog/planning-guide', ...overrides })
const subscriber = (overrides = {}) => ({ id: subscriberId, email: 'person@example.com', preferredLocale: 'en', status: 'subscribed', ...overrides })

class FakeRepository {
  constructor({ currentCampaign = campaign(), currentSubscriber = subscriber(), job = { id: jobId, campaignId, subscriberId, channel: 'email', attemptCount: 0 } } = {}) { this.currentCampaign = currentCampaign; this.currentSubscriber = currentSubscriber; this.job = job; this.outcomes = [] }
  async claimJobs() { return this.job ? [this.job] : [] }
  async getCampaign() { return this.currentCampaign }
  async getSubscriber() { return this.currentSubscriber }
  async recordOutcome(id, outcome) { this.outcomes.push({ id, ...outcome }) }
}

class FakeProvider {
  constructor(result) { this.result = result; this.messages = [] }
  async send(message) { this.messages.push(message); return this.result }
}

const unsubscribeUrls = (value = 'https://mythirumanam.in/unsubscribe/test') => ({ async resolve() { return value } })
const noSuppression = { async hasActiveSuppression() { return false } }

test('English and Tamil templates render campaign snapshots, CTAs, and independent-service copy', () => {
  const english = renderBlogPublicationEmail(campaign(), 'https://example.test/unsubscribe')
  const tamil = renderBlogPublicationEmail(campaign({ locale: 'ta', headline: 'திட்டமிடல் வழிகாட்டி' }), 'https://example.test/unsubscribe')
  assert.match(english.html, /Planning Guide/)
  assert.match(english.html, /Read the Full Guide/)
  assert.match(english.html, /https:\/\/mythirumanam\.in\/plan/)
  assert.match(english.html, /Independent celebration planning and coordination service\./)
  assert.match(tamil.html, /திட்டமிடல் வழிகாட்டி/)
  assert.match(tamil.html, /முழு வழிகாட்டியை படிக்கவும்/)
  assert.throws(() => renderBlogPublicationEmail(campaign(), ''), /unsubscribe URL is required/)
  assert.doesNotMatch(english.html + tamil.html, /temple affiliated|temple authorization|authorized temple/i)
})

test('worker sends a matching subscribed recipient with a stable job idempotency key', async () => {
  const repository = new FakeRepository()
  const provider = new FakeProvider({ status: 'accepted', providerMessageId: 'provider-1' })
  await new NotificationWorker(repository, provider, unsubscribeUrls(), noSuppression, () => now, 'MyThirumanam <updates@example.test>').processNotificationBatch()
  assert.equal(provider.messages.length, 1)
  assert.equal(provider.messages[0].idempotencyKey, jobId)
  assert.deepEqual(repository.outcomes[0], { id: jobId, status: 'sent', attemptCount: 1, providerMessageId: 'provider-1' })
})

test('unsubscribed or locale-mismatched subscribers are skipped without provider calls', async () => {
  for (const currentSubscriber of [subscriber({ status: 'unsubscribed' }), subscriber({ preferredLocale: 'ta' })]) {
    const repository = new FakeRepository({ currentSubscriber })
    const provider = new FakeProvider({ status: 'accepted', providerMessageId: 'unexpected' })
    await new NotificationWorker(repository, provider, unsubscribeUrls(), noSuppression, () => now).processNotificationBatch()
    assert.equal(provider.messages.length, 0)
    assert.equal(repository.outcomes[0].status, 'skipped')
    assert.ok(['unsubscribed', 'locale_mismatch'].includes(repository.outcomes[0].errorCode))
  }
})

test('missing unsubscribe URL blocks provider delivery safely', async () => {
  const repository = new FakeRepository()
  const provider = new FakeProvider({ status: 'accepted', providerMessageId: 'unexpected' })
  await new NotificationWorker(repository, provider, unsubscribeUrls(null), noSuppression, () => now).processNotificationBatch()
  assert.equal(provider.messages.length, 0)
  assert.deepEqual(repository.outcomes[0], { id: jobId, status: 'failed', attemptCount: 0, errorCode: 'unsubscribe_unavailable' })
})

test('retryable provider failures use the central retry policy and permanent failures fail immediately', async () => {
  const retryRepository = new FakeRepository()
  await new NotificationWorker(retryRepository, new FakeProvider({ status: 'failed', retryable: true, errorCode: 'provider_unavailable' }), unsubscribeUrls(), noSuppression, () => now).processNotificationBatch()
  assert.deepEqual(retryRepository.outcomes[0], { id: jobId, status: 'retry', attemptCount: 1, errorCode: 'provider_unavailable', nextAttemptAt: '2026-09-24T12:05:00.000Z' })
  const permanentRepository = new FakeRepository()
  await new NotificationWorker(permanentRepository, new FakeProvider({ status: 'failed', retryable: false, errorCode: 'invalid_recipient' }), unsubscribeUrls(), noSuppression, () => now).processNotificationBatch()
  assert.deepEqual(permanentRepository.outcomes[0], { id: jobId, status: 'failed', attemptCount: 1, errorCode: 'invalid_recipient' })
  assert.equal(MAX_NOTIFICATION_ATTEMPTS, 4)
  assert.equal(getRetryDelayMs(2), 30 * 60 * 1000)
  assert.equal(shouldRetry(4, true), false)
})

test('provider adapter normalizes configuration and response outcomes without network construction', async () => {
  let calls = 0
  const missing = new ResendEmailProvider({ apiKey: '', from: '', request: async () => { calls += 1; throw new Error('should not run') } })
  assert.deepEqual(await missing.send({ to: 'person@example.com', from: '', subject: 'Test', html: '<p>Test</p>', text: 'Test', idempotencyKey: jobId }), { status: 'failed', retryable: false, errorCode: 'provider_not_configured' })
  assert.equal(calls, 0)
  const accepted = new ResendEmailProvider({ apiKey: 'test-key', from: 'MyThirumanam <updates@example.test>', request: async (_url, init) => { assert.equal(init.headers['idempotency-key'], jobId); return Response.json({ id: 'resend-1' }) } })
  assert.deepEqual(await accepted.send({ to: 'person@example.com', from: '', subject: 'Test', html: '<p>Test</p>', text: 'Test', idempotencyKey: jobId }), { status: 'accepted', providerMessageId: 'resend-1' })
})

test('worker migration claims with SKIP LOCKED, bounded batches, stale-lease recovery, and atomic outcomes', () => {
  const migration = readFileSync(new URL('../supabase/migrations/add_notification_worker_functions.sql', import.meta.url), 'utf8')
  assert.match(migration, /claim_notification_jobs/)
  assert.match(migration, /GREATEST\(1, LEAST\(COALESCE\(p_batch_size, 25\), 50\)\)/)
  assert.match(migration, /FOR UPDATE OF job SKIP LOCKED/)
  assert.match(migration, /job\.status = 'pending' OR \(job\.status = 'retry' AND job\.next_attempt_at <= NOW\(\)\)/)
  assert.match(migration, /SET status = 'processing', claimed_at = NOW\(\)/)
  assert.match(migration, /status = 'processing' AND claimed_at < NOW\(\) - INTERVAL '15 minutes'/)
  assert.match(migration, /record_notification_job_outcome/)
  assert.match(migration, /SELECT \* INTO v_job.*FOR UPDATE/s)
  assert.match(migration, /sent_count = sent_count \+ CASE WHEN p_outcome = 'sent' THEN 1 ELSE 0 END/)
  assert.match(migration, /WHEN v_campaign\.failed_count = 0 THEN 'completed'/)
  assert.match(migration, /WHEN v_campaign\.sent_count > 0 THEN 'partially_failed'/)
  assert.match(migration, /status IN \('pending', 'processing', 'retry'\)/)
})

test('worker/provider remain notification-owned with no public trigger, scheduler, Blog, or provider leak', () => {
  const files = [
    'src/modules/notifications/workers/notification-worker.ts',
    'src/modules/notifications/workers/notification-worker-repository.ts',
    'src/modules/notifications/providers/email-provider.ts',
    'src/modules/notifications/providers/resend-email-provider.ts',
  ]
  const source = files.map((path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')).join('\n')
  assert.doesNotMatch(source, /@\/lib\/blog|@\/content\/blog|blog_posts|NextRequest|NextResponse|setInterval|cron|scheduler|api\/internal/i)
  assert.doesNotMatch(readFileSync(new URL('../src/components/admin/BlogCampaignControls.tsx', import.meta.url), 'utf8'), /Queue Campaign|Send Campaign/)
  assert.doesNotMatch(source, /console\.(?:log|error)[\s\S]*(?:subscriber\.email|message\.to)/)
})

test('worker function verifier is read-only and functions are service-role only', () => {
  const migration = readFileSync(new URL('../supabase/migrations/add_notification_worker_functions.sql', import.meta.url), 'utf8')
  const verifier = readFileSync(new URL('../supabase/migrations/verify_notification_worker_functions.sql', import.meta.url), 'utf8')
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.claim_notification_jobs\(INTEGER\) FROM PUBLIC, anon, authenticated/)
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.claim_notification_jobs\(INTEGER\) TO service_role/)
  assert.match(verifier, /claim_notification_jobs/)
  assert.doesNotMatch(verifier, /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i)
})
