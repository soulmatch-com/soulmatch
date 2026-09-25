import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const { mapResendWebhook } = await import('../src/modules/notifications/providers/resend/resend-webhook-mapper.ts')
const root = new URL('../', import.meta.url); const read = (path) => readFile(new URL(path, root), 'utf8')
const route = await read('src/app/api/webhooks/resend/route.ts'); const verifier = await read('src/modules/notifications/providers/resend/resend-webhook-verifier.ts')
const mapper = await read('src/modules/notifications/providers/resend/resend-webhook-mapper.ts'); const repository = await read('src/modules/notifications/webhooks/provider-event-repository.ts')
const migration = await read('supabase/migrations/add_notification_provider_events.sql'); const preview = await read('src/components/admin/BlogCampaignPreview.tsx'); const bridge = await read('src/lib/blog/blog-notification-campaign.ts')

const event = (type, extra = {}) => ({ type, created_at: '2026-09-24T10:00:00.000Z', data: { email_id: 'provider-message-id', created_at: '2026-09-24T09:59:00.000Z', message_id: '<x>', from: 'sender@example.test', to: ['private@example.test'], subject: 'Private', ...extra } })

test('Resend adapter maps verified email_id without recipient lookup and classifies supported outcomes', () => {
  assert.equal(mapResendWebhook(event('email.delivered'), 'evt-1').providerMessageId, 'provider-message-id')
  assert.equal(mapResendWebhook(event('email.delivery_delayed'), 'evt-2').deliveryStatus, 'delayed')
  assert.equal(mapResendWebhook(event('email.complained'), 'evt-3').suppressionReason, 'complaint')
  assert.equal(mapResendWebhook(event('email.suppressed'), 'evt-4').suppressionReason, 'provider_suppression')
  assert.equal(mapResendWebhook(event('email.bounced', { bounce: { type: 'Permanent', subType: 'x', message: 'x' } }), 'evt-5').suppressionReason, 'bounce')
  assert.equal(mapResendWebhook(event('email.bounced', { bounce: { type: 'Transient', subType: 'x', message: 'x' } }), 'evt-6').suppressionReason, null)
  assert.doesNotMatch(mapper, /\.to\b.*find|find.*\.to\b/)
})

test('webhook verifies raw body with official Resend helper and fails closed', () => {
  assert.match(route, /await request\.text\(\)/)
  assert.doesNotMatch(route, /request\.json\(\)/)
  assert.match(verifier, /new Resend\(\)\.webhooks\.verify/)
  assert.match(verifier, /RESEND_WEBHOOK_SECRET/)
  assert.match(verifier, /svix-id|headers: \{ id/)
  assert.match(verifier, /!secret.*!headers\.id/s)
  assert.doesNotMatch(route + verifier, /webhookSecret.*console|console.*webhookSecret/)
})

test('provider event persistence is idempotent, private, timestamp-ordered, and consent-independent', () => {
  assert.match(migration, /UNIQUE \(provider, provider_event_id\)/)
  assert.match(migration, /ON CONFLICT \(provider, provider_event_id\) DO NOTHING/)
  assert.match(migration, /provider_message_id = p_provider_message_id/)
  assert.match(migration, /p_occurred_at >= v_job\.delivery_updated_at/)
  assert.match(migration, /COALESCE\(delivered_at, p_occurred_at\)/)
  assert.match(migration, /INSERT INTO public\.email_suppressions/)
  assert.doesNotMatch(migration, /UPDATE public\.email_subscribers/)
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /REVOKE ALL ON TABLE public\.notification_provider_events/)
  assert.doesNotMatch(migration, /raw_payload/)
})

test('generic provider-event repository only invokes notification RPCs and handles unmatched/ignored/duplicates safely', () => {
  assert.match(repository, /process_notification_provider_event/)
  assert.match(repository, /get_notification_campaign_delivery_summary/)
  assert.doesNotMatch(repository, /blog|email_subscribers|Resend/)
  for (const status of ['already_processed', 'unmatched', 'ignored', 'processed']) assert.match(migration, new RegExp(status))
})

test('admin preview reads provider delivery summary through Blog-to-Notification boundary without subscriber identities', () => {
  assert.match(bridge, /getBlogCampaignDeliverySummary/)
  assert.match(preview, /Provider delivery outcomes/)
  for (const label of ['Delivered:', 'Delayed:', 'Bounced:', 'Complained:', 'Suppressed:', 'Provider Failed:']) assert.match(preview, new RegExp(label))
  assert.doesNotMatch(preview, /subscriberId|subscriber email|email_subscribers/)
  assert.match(migration, /FROM public\.notification_jobs WHERE campaign_id/)
})

test('admin preview remains available when the later provider-event migration has not been applied', async () => {
  const page = await read('src/app/(en)/admin/(protected)/blogs/[id]/campaign/[campaignId]/preview/page.tsx')
  assert.match(page, /deliverySummary = null/)
  assert.match(preview, /Provider delivery summary is unavailable until notification provider-event storage is configured\./)
})
