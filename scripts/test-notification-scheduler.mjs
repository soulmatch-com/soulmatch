import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const { NotificationScheduler } = await import('../src/modules/notifications/scheduler/notification-scheduler.ts')
const { getNotificationSchedulerConfig } = await import('../src/modules/notifications/scheduler/notification-scheduler-config.ts')
const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const scheduler = await read('src/modules/notifications/scheduler/notification-scheduler.ts')
const config = await read('src/modules/notifications/scheduler/notification-scheduler-config.ts')
const route = await read('src/app/api/internal/notifications/scheduled-process/route.ts')
const workerFactory = await read('src/modules/notifications/workers/notification-worker-factory.ts')
const queueRoute = await read('src/app/api/admin/blogs/[id]/campaign/[campaignId]/queue/route.ts')
const env = await read('.env.example')
const vercel = JSON.parse(await read('vercel.json'))

const batch = (claimed, sent = claimed, skipped = 0, retried = 0, failed = 0) => ({ claimed, sent, skipped, retried, failed })

test('scheduler is disabled unless the enable flag is exactly true', () => {
  const prior = process.env.NOTIFICATION_SCHEDULER_ENABLED
  for (const value of [undefined, 'false', 'TRUE', '1', 'yes']) {
    if (value === undefined) delete process.env.NOTIFICATION_SCHEDULER_ENABLED
    else process.env.NOTIFICATION_SCHEDULER_ENABLED = value
    assert.equal(getNotificationSchedulerConfig().enabled, false)
  }
  process.env.NOTIFICATION_SCHEDULER_ENABLED = 'true'
  assert.equal(getNotificationSchedulerConfig().enabled, true)
  if (prior === undefined) delete process.env.NOTIFICATION_SCHEDULER_ENABLED
  else process.env.NOTIFICATION_SCHEDULER_ENABLED = prior
})

test('disabled scheduler invokes no worker', async () => {
  let calls = 0
  const result = await new NotificationScheduler({ async processNotificationBatch() { calls += 1; return batch(0) } }, { enabled: false, batchSize: 25, maxBatchesPerRun: 4 }).processScheduledNotifications()
  assert.deepEqual(result, { status: 'disabled', batches: 0, claimed: 0, sent: 0, skipped: 0, retried: 0, failed: 0 })
  assert.equal(calls, 0)
})

test('scheduler aggregates full batches, stops on partial or zero work, and enforces max batches', async () => {
  const calls = []
  const results = [batch(25, 20, 2, 2, 1), batch(12, 10, 1, 1, 0)]
  const partial = await new NotificationScheduler({ async processNotificationBatch(size) { calls.push(size); return results.shift() } }, { enabled: true, batchSize: 25, maxBatchesPerRun: 4 }).processScheduledNotifications()
  assert.deepEqual(calls, [25, 25])
  assert.deepEqual(partial, { status: 'processed', batches: 2, claimed: 37, sent: 30, skipped: 3, retried: 3, failed: 1 })

  let zeroCalls = 0
  const zero = await new NotificationScheduler({ async processNotificationBatch() { zeroCalls += 1; return batch(0) } }, { enabled: true, batchSize: 25, maxBatchesPerRun: 4 }).processScheduledNotifications()
  assert.equal(zeroCalls, 1)
  assert.equal(zero.batches, 1)

  let fullCalls = 0
  const bounded = await new NotificationScheduler({ async processNotificationBatch() { fullCalls += 1; return batch(25) } }, { enabled: true, batchSize: 25, maxBatchesPerRun: 4 }).processScheduledNotifications()
  assert.equal(fullCalls, 4)
  assert.equal(bounded.claimed, 100)
})

test('unexpected later-batch failure stops safely while preserving prior aggregate progress', async () => {
  let calls = 0
  const result = await new NotificationScheduler({ async processNotificationBatch() { calls += 1; if (calls === 2) throw new Error('infrastructure failure'); return batch(25, 24, 1) } }, { enabled: true, batchSize: 25, maxBatchesPerRun: 4 }).processScheduledNotifications()
  assert.deepEqual(result, { status: 'failed', batches: 1, claimed: 25, sent: 24, skipped: 1, retried: 0, failed: 0 })
})

test('scheduler route uses separate cron authentication and only the worker boundary', () => {
  assert.match(route, /CRON_SECRET/)
  assert.match(route, /timingSafeEqual/)
  assert.match(route, /export async function GET/)
  assert.match(route, /NotificationScheduler\(createNotificationWorker\(\)/)
  assert.doesNotMatch(route, /NOTIFICATION_WORKER_SECRET|searchParams|ResendEmailProvider|notification_jobs|fetch\(/)
  assert.match(scheduler, /processNotificationBatch/)
  assert.doesNotMatch(scheduler, /Resend|notification_jobs|retry-policy|campaigns|subscribers|setInterval|setTimeout/)
  assert.match(workerFactory, /ResendEmailProvider/)
  assert.doesNotMatch(queueRoute, /NotificationScheduler|scheduled-process|createNotificationWorker/)
})

test('default-off deployment configuration documents secrets without registering an unsupported frequent Vercel cron', () => {
  assert.match(config, /NOTIFICATION_SCHEDULER_ENABLED === 'true'/)
  assert.match(env, /NOTIFICATION_SCHEDULER_ENABLED=false/)
  assert.match(env, /CRON_SECRET=/)
  const notificationCron = (vercel.crons ?? []).find((cron) => cron.path === '/api/internal/notifications/scheduled-process')
  assert.equal(notificationCron, undefined)
  assert.doesNotMatch(JSON.stringify(vercel), /\*\/5 \* \* \* \*/)
  assert.match(scheduler, /result\.claimed < this\.config\.batchSize/)
})
