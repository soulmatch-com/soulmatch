import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { CampaignQueueService } from '../src/modules/notifications/queue/campaign-queue-service.ts'

const campaignId = '11111111-1111-4111-8111-111111111111'

class MemoryQueueRepository {
  constructor(result) { this.result = result; this.calls = 0 }
  async queueCampaign(id) { this.calls += 1; return { ...this.result, campaignId: id } }
}

test('queue service returns safe queued and no-recipient outcomes without recipient identities', async () => {
  const queued = new MemoryQueueRepository({ status: 'queued', recipientCount: 2 })
  assert.deepEqual(await new CampaignQueueService(queued).prepareCampaignForDelivery(campaignId), { status: 'queued', campaignId, recipientCount: 2 })
  const empty = new MemoryQueueRepository({ status: 'no_recipients', recipientCount: 0 })
  assert.deepEqual(await new CampaignQueueService(empty).prepareCampaignForDelivery(campaignId), { status: 'no_recipients', campaignId, recipientCount: 0 })
})

test('queue service rejects malformed campaign IDs before a repository call', async () => {
  const repository = new MemoryQueueRepository({ status: 'queued', recipientCount: 2 })
  assert.deepEqual(await new CampaignQueueService(repository).prepareCampaignForDelivery('invalid'), { status: 'not_found', campaignId: 'invalid', recipientCount: 0 })
  assert.equal(repository.calls, 0)
})

test('jobs migration creates notification-owned pending jobs with foreign keys and duplicate protection', () => {
  const migration = readFileSync(new URL('../supabase/migrations/add_notification_jobs.sql', import.meta.url), 'utf8')
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.notification_jobs/)
  assert.match(migration, /campaign_id UUID NOT NULL REFERENCES public\.notification_campaigns\(id\)/)
  assert.match(migration, /subscriber_id UUID NOT NULL REFERENCES public\.email_subscribers\(id\)/)
  assert.match(migration, /status TEXT NOT NULL DEFAULT 'pending'/)
  assert.match(migration, /UNIQUE \(campaign_id, subscriber_id, channel\)/)
  assert.doesNotMatch(migration, /\b(?:subscriber_email|email_snapshot|email_address)\b/i)
  assert.doesNotMatch(migration, /blog_posts|blog_post_translations/i)
})

test('eligible recipients are exactly subscribed subscribers with the matching campaign locale', () => {
  const migration = readFileSync(new URL('../supabase/migrations/add_notification_jobs.sql', import.meta.url), 'utf8')
  assert.match(migration, /subscriber\.status = 'subscribed'/)
  assert.match(migration, /subscriber\.preferred_locale = v_campaign\.locale/)
  assert.doesNotMatch(migration, /consent_source/)
  assert.match(migration, /v_campaign\.locale IS NULL OR v_campaign\.locale NOT IN \('en', 'ta'\)/)
})

test('atomic RPC locks draft campaign, inserts jobs, then transitions campaign and counters together', () => {
  const migration = readFileSync(new URL('../supabase/migrations/add_notification_jobs.sql', import.meta.url), 'utf8')
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.queue_notification_campaign/)
  assert.match(migration, /FOR UPDATE/)
  assert.ok(migration.indexOf('INSERT INTO public.notification_jobs') < migration.indexOf("SET status = 'queued'"))
  assert.match(migration, /GET DIAGNOSTICS v_recipient_count = ROW_COUNT/)
  assert.match(migration, /recipient_count = v_recipient_count/)
  assert.match(migration, /sent_count = 0, failed_count = 0, skipped_count = 0/)
})

test('zero recipients leaves campaign draft and repeated queue requests are idempotent', () => {
  const migration = readFileSync(new URL('../supabase/migrations/add_notification_jobs.sql', import.meta.url), 'utf8')
  const noRecipients = migration.slice(migration.indexOf('IF v_recipient_count = 0'), migration.indexOf("UPDATE public.notification_campaigns"))
  assert.match(noRecipients, /'no_recipients'/)
  assert.doesNotMatch(noRecipients, /UPDATE public\.notification_campaigns/)
  assert.match(migration, /IF v_campaign\.status = 'queued'/)
  assert.match(migration, /'already_queued'/)
  assert.match(migration, /ON CONFLICT \(campaign_id, subscriber_id, channel\) DO NOTHING/)
})

test('queue schema is private, indexed for future claiming, and documents unsubscribe re-check safety', () => {
  const migration = readFileSync(new URL('../supabase/migrations/add_notification_jobs.sql', import.meta.url), 'utf8')
  const types = readFileSync(new URL('../src/modules/notifications/queue/notification-job-types.ts', import.meta.url), 'utf8')
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /REVOKE ALL ON TABLE public\.notification_jobs FROM PUBLIC, anon, authenticated/)
  assert.match(migration, /notification_jobs_pending_retry_idx/)
  assert.match(types, /MUST re-check subscriber\.status === 'subscribed' immediately before delivery/)
})

test('queue domain has no Blog, React, provider, worker, or public HTTP dependency', () => {
  const files = ['notification-job-types.ts', 'notification-job-repository.ts', 'campaign-queue-service.ts', 'campaign-queue-authorized-service.ts']
  const source = files.map((file) => readFileSync(new URL(`../src/modules/notifications/queue/${file}`, import.meta.url), 'utf8')).join('\n')
  assert.doesNotMatch(source, /@\/lib\/blog|@\/content\/blog|blog_posts|from ['"]react|NextRequest|NextResponse|resend|gmail|sendgrid|smtp|cron|notification_jobs.*processor/i)
  assert.match(source, /requireActiveAdmin\(\)/)
  assert.doesNotMatch(source, /adminId|createdBy|role|permission/)
})

test('read-only verifier covers jobs, counters, privileges, and queue RPC', () => {
  const verifier = readFileSync(new URL('../supabase/migrations/verify_notification_jobs.sql', import.meta.url), 'utf8')
  assert.match(verifier, /notification_jobs/)
  assert.match(verifier, /notification_campaigns/)
  assert.match(verifier, /queue_notification_campaign/)
  assert.doesNotMatch(verifier, /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i)
})
