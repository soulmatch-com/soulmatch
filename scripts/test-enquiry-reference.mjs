import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('reference migration uses an India-time daily atomic counter', async () => {
  const source = await read('supabase/migrations/add_enquiry_reference.sql')
  assert.match(source, /CURRENT_TIMESTAMP AT TIME ZONE 'Asia\/Kolkata'/)
  assert.match(source, /ON CONFLICT \(reference_date\)/)
  assert.match(source, /last_number \+ 1/)
  assert.match(source, /to_char\(v_reference_date, 'DDMMYYYY'\)/)
  assert.match(source, /lpad\(v_sequence_number::text, 5, '0'\)/)
  assert.doesNotMatch(source, /MAX\s*\(|count\s*\(\s*\*\s*\)/i)
})

test('reference migration protects the five-digit limit and uniqueness', async () => {
  const source = await read('supabase/migrations/add_enquiry_reference.sql')
  assert.match(source, /last_number <= 99999/)
  assert.match(source, /v_sequence_number > 99999/)
  assert.match(source, /celebration_enquiries_enquiry_reference_unique/)
  assert.match(source, /WHERE enquiry_reference IS NOT NULL/)
})

test('counter infrastructure has no public table or function access', async () => {
  const source = await read('supabase/migrations/add_enquiry_reference.sql')
  assert.match(source, /ENABLE ROW LEVEL SECURITY/)
  assert.match(source, /REVOKE ALL ON TABLE public\.celebration_enquiry_reference_counters FROM PUBLIC, anon, authenticated/)
  assert.match(source, /REVOKE ALL ON FUNCTION public\.assign_celebration_enquiry_reference\(\) FROM PUBLIC, anon, authenticated/)
})

test('API and customer notifications use the stored MYT reference', async () => {
  const [route, client, legacy, v2, email] = await Promise.all([
    read('src/app/api/celebrations/enquiries/route.ts'),
    read('src/lib/celebrations/client-submission.ts'),
    read('src/components/celebrations/EnquirySummary.tsx'),
    read('src/components/celebrations/PlanV2Flow.tsx'),
    read('src/lib/celebrations/email/booking-notification.ts'),
  ])
  assert.match(route, /enquiryReference: enquiry\.enquiry_reference/)
  assert.match(client, /!result\.enquiryReference/)
  assert.match(legacy, /enquiryReference/)
  assert.match(v2, /enquiryReference/)
  assert.match(email, /\['Enquiry Reference', enquiryReference\]/)
  assert.doesNotMatch(`${legacy}\n${v2}`, /\{enquiryId\}/)
})

test('read-only verifier covers the counter and reference index', async () => {
  const source = await read('supabase/migrations/verify_enquiry_reference.sql')
  assert.match(source, /enquiry_reference/)
  assert.match(source, /celebration_enquiry_reference_counters/)
  assert.match(source, /celebration_enquiries_enquiry_reference_unique/)
  assert.doesNotMatch(source, /INSERT|UPDATE|DELETE|ALTER|DROP|CREATE/i)
})
