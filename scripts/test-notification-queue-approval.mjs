import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const preview = await read('src/components/admin/BlogCampaignPreview.tsx')
const previewRoute = await read('src/app/(en)/admin/(protected)/blogs/[id]/campaign/[campaignId]/preview/page.tsx')
const queueRoute = await read('src/app/api/admin/blogs/[id]/campaign/[campaignId]/queue/route.ts')
const bridge = await read('src/lib/blog/blog-notification-campaign.ts')
const queueService = await read('src/modules/notifications/queue/campaign-queue-service.ts')
const queueRepository = await read('src/modules/notifications/queue/notification-job-repository.ts')
const workerRoute = await read('src/app/api/internal/notifications/process/route.ts')
const worker = await read('src/modules/notifications/workers/notification-worker.ts')
const migration = await read('supabase/migrations/add_notification_queue_audit.sql')
const verifier = await read('supabase/migrations/verify_notification_queue_audit.sql')
const env = await read('.env.example')

test('draft preview shows recipient estimate, accessible confirmation, and queue action only for draft', () => {
  assert.match(previewRoute, /getBlogCampaignRecipientEstimate/)
  assert.match(preview, /campaign\.status === 'draft'/)
  assert.match(preview, /Eligible recipients:/)
  assert.match(preview, /Queue Campaign/)
  assert.match(preview, /role="dialog"/)
  assert.match(preview, /aria-modal="true"/)
  assert.match(preview, /Recipients will be recalculated when queued\./)
  assert.match(preview, /if \(submitting\) return/)
  assert.match(preview, /disabled=\{submitting\}/)
  for (const status of ['queued', 'processing', 'completed', 'partially_failed', 'failed', 'cancelled']) assert.match(preview, new RegExp(status))
})

test('recipient estimate is notification-owned and never creates jobs or changes campaign status', () => {
  assert.match(queueService, /estimateCampaignRecipients/)
  assert.match(queueRepository, /count_notification_campaign_recipients/)
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.count_notification_campaign_recipients/)
  assert.match(migration, /subscriber\.status = 'subscribed'/)
  assert.match(migration, /subscriber\.preferred_locale = v_campaign\.locale/)
  assert.match(migration, /suppression\.released_at IS NULL/)
  const estimate = migration.slice(migration.indexOf('count_notification_campaign_recipients'), migration.indexOf('DROP FUNCTION'))
  assert.doesNotMatch(estimate, /INSERT INTO public\.notification_jobs|UPDATE public\.notification_campaigns/)
})

test('queue API is admin-authenticated, derives trusted identifiers, validates published source, and never invokes worker/provider', () => {
  assert.match(queueRoute, /requireActiveAdmin\(\)/)
  assert.match(queueRoute, /blogIdSchema\.parse\(id\)/)
  assert.match(queueRoute, /campaignId\(rawCampaignId\)/)
  assert.match(queueRoute, /queuePublishedBlogCampaign/)
  assert.doesNotMatch(queueRoute, /request\.json|recipientCount|subscriberIds|emails|EmailProvider|NotificationWorker/)
  assert.match(bridge, /requirePublishedCampaignSource/)
  assert.match(bridge, /translation\.status !== 'published'/)
  assert.match(bridge, /campaign\.status !== 'draft' && campaign\.status !== 'queued'/)
  assert.match(bridge, /prepareCampaignForDelivery\(campaign\.id, actorId\)/)
})

test('queue audit migration is atomic, private, and does not add a Blog foreign key', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS queued_by UUID NULL/)
  assert.match(migration, /FOR UPDATE/)
  assert.match(migration, /INSERT INTO public\.notification_jobs/)
  assert.match(migration, /SET status = 'queued'.*queued_by = p_queued_by/s)
  assert.match(migration, /REVOKE ALL ON FUNCTION/)
  assert.doesNotMatch(migration, /blog_posts|blog_post_translations/)
  assert.doesNotMatch(verifier, /INSERT|UPDATE|DELETE|ALTER|CREATE|DROP/i)
})

test('internal worker endpoint is POST-only, Bearer-secret protected, bounded, awaited, and returns aggregates only', () => {
  assert.match(workerRoute, /NOTIFICATION_WORKER_SECRET/)
  assert.match(workerRoute, /timingSafeEqual/)
  assert.match(workerRoute, /authorization/)
  assert.match(workerRoute, /export async function POST/)
  assert.match(workerRoute, /await createNotificationWorker\(\)\.processNotificationBatch\(\)/)
  assert.match(workerRoute, /export function GET/)
  assert.match(workerRoute, /status: 405/)
  assert.doesNotMatch(workerRoute, /searchParams|query.*secret|setInterval|setTimeout|Promise\.resolve\(/i)
  assert.match(worker, /DEFAULT_NOTIFICATION_BATCH_SIZE/)
  assert.match(worker, /Math\.min\(MAX_NOTIFICATION_BATCH_SIZE, batchSize\)/)
  assert.match(worker, /\{ claimed: jobs\.length, sent: 0, skipped: 0, retried: 0, failed: 0 \}/)
  assert.match(env, /NOTIFICATION_WORKER_SECRET=/)
})

test('worker safety and architecture remain notification-owned with no scheduler or automatic queue send', () => {
  for (const source of [workerRoute, worker, queueRoute, bridge].join('\n')) {
    assert.doesNotMatch(source, /src\/lib\/blog\/admin-blog-repository.*NotificationWorker|Resend.*blog|setInterval|cron/i)
  }
  assert.match(worker, /subscriber\.status !== 'subscribed'/)
  assert.match(worker, /subscriber\.preferredLocale !== campaign\.locale/)
  assert.match(worker, /hasActiveSuppression/)
  assert.match(worker, /unsubscribe_unavailable/)
  assert.doesNotMatch(preview, /Send Campaign/)
})
