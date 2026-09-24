import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url); const read = (p) => readFile(new URL(p, root), 'utf8')
const master = await read('supabase/migrations/verify_notification_system.sql'); const runbook = await read('docs/notification-production-rollout.md')
const scheduler = await read('src/modules/notifications/scheduler/notification-scheduler-config.ts'); const worker = await read('src/modules/notifications/workers/notification-worker.ts')
const queue = await read('src/modules/notifications/queue/campaign-queue-service.ts'); const unsubscribe = await read('src/app/(en)/unsubscribe/page.tsx'); const webhook = await read('src/app/api/webhooks/resend/route.ts')
const notificationFiles = ['campaigns/campaign-service.ts','queue/campaign-queue-service.ts','scheduler/notification-scheduler.ts','webhooks/provider-event-service.ts'].map((p) => read(`src/modules/notifications/${p}`))

test('master verifier is read-only and targets final notification tables, constraints, indexes, and RPC signatures', async () => {
  for (const table of ['email_subscribers','notification_campaigns','notification_jobs','email_suppressions','notification_provider_events']) assert.match(master, new RegExp(table))
  for (const fn of ['queue_notification_campaign\\(uuid,uuid\\)','claim_notification_jobs\\(integer\\)','record_notification_job_outcome','process_notification_provider_event','get_notification_campaign_delivery_summary']) assert.match(master, new RegExp(fn))
  assert.doesNotMatch(master, /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE)\b/i)
})

test('deployment safety remains default-off and execution separation is preserved', () => {
  assert.match(scheduler, /NOTIFICATION_SCHEDULER_ENABLED === 'true'/)
  assert.match(queue, /prepareCampaignForDelivery/)
  assert.doesNotMatch(queue, /EmailProvider|\.send\(/)
  assert.match(worker, /this\.provider\.send/)
  assert.match(unsubscribe, /verifyUnsubscribeToken/)
  assert.doesNotMatch(unsubscribe, /UnsubscribeService|fetch\(/)
  assert.match(webhook, /await request\.text\(\)/)
})

test('notification domain is Blog-independent and the runbook preserves the explicit approval gate', async () => {
  for (const source of await Promise.all(notificationFiles)) assert.doesNotMatch(source, /@\/lib\/blog|@\/content\/blog|blog_posts|blog_post_translations/)
  for (const text of ['NOTIFICATION_SCHEDULER_ENABLED=false','add_notification_provider_events.sql','fix_notification_queue_campaign_ambiguity.sql','fix_notification_worker_claim_id_ambiguity.sql','RESEND_WEBHOOK_SECRET','manual worker','AWAITING EXPLICIT TARGET APPROVAL']) {
    if (text === 'AWAITING EXPLICIT TARGET APPROVAL') assert.match(runbook, /explicit target approval/i)
    else if (text === 'manual worker') assert.match(runbook, /manually invoke the protected worker/i)
    else assert.match(runbook, new RegExp(text))
  }
})
