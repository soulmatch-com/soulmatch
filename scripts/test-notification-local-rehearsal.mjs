import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const queueFix = await read('supabase/migrations/fix_notification_queue_campaign_ambiguity.sql')
const workerFix = await read('supabase/migrations/fix_notification_worker_claim_ambiguity.sql')
const workerIdFix = await read('supabase/migrations/fix_notification_worker_claim_id_ambiguity.sql')
const verifiers = await Promise.all([
  'supabase/migrations/verify_notification_queue_campaign_fix.sql',
  'supabase/migrations/verify_notification_worker_claim_fix.sql',
  'supabase/migrations/verify_notification_worker_claim_id_fix.sql',
].map(read))
const rehearsal = await read('supabase/tests/notification-local-rehearsal.sql')

test('corrective migrations preserve RPC contracts and resolve ambiguous identifiers explicitly', () => {
  assert.match(queueFix, /RETURNS TABLE\(status TEXT, campaign_id UUID, recipient_count INTEGER\)/)
  assert.match(queueFix, /ON CONFLICT ON CONSTRAINT notification_jobs_campaign_subscriber_channel_unique DO NOTHING/)
  assert.doesNotMatch(queueFix, /variable_conflict/)
  for (const source of [workerFix, workerIdFix]) assert.match(source, /RETURNS TABLE\(id UUID, campaign_id UUID, subscriber_id UUID, channel TEXT, attempt_count INTEGER\)/)
  assert.match(workerFix, /SELECT claimed\.campaign_id FROM claimed/)
  assert.match(workerIdFix, /campaign_to_start\.id IN \(SELECT claimed\.campaign_id FROM claimed\)/)
})

test('corrective verifiers are read-only and the local rehearsal rolls back fake data', () => {
  for (const source of verifiers) assert.doesNotMatch(source, /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE)\b/i)
  assert.match(rehearsal, /^BEGIN;/m)
  assert.match(rehearsal, /^ROLLBACK;/m)
  assert.match(rehearsal, /@example\.invalid/)
  assert.doesNotMatch(rehearsal, /resend\.com|https:\/\/[^\s]*supabase\.co/i)
})
