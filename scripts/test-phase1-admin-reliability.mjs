import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('enquiry RPC stores an idempotency key and creates the website lead in its transaction', async () => {
  const migration = await read('supabase/migrations/20261009_phase1_admin_reliability.sql')
  assert.match(migration, /celebration_enquiries_idempotency_key_unique/)
  assert.match(migration, /p_idempotency_key TEXT DEFAULT NULL/)
  assert.match(migration, /INSERT INTO public\.celebration_enquiry_services[\s\S]*INSERT INTO public\.leads/)
  assert.match(migration, /Unable to create linked lead/)
  assert.match(migration, /WHEN unique_violation[\s\S]*idempotency_key/)
})

test('public route passes a validated idempotency key and no longer performs best-effort lead creation', async () => {
  const route = await read('src/app/api/celebrations/enquiries/route.ts')
  assert.match(route, /request\.headers\.get\('idempotency-key'\)/)
  assert.match(route, /persistCelebrationEnquiry\([^,]+, validation\.data, suppliedIdempotencyKey\)/)
  assert.doesNotMatch(route, /from\('leads'\)\.upsert/)
})

test('quotation create and update use server-side transactional RPCs', async () => {
  const [migration, createRoute, updateRoute] = await Promise.all([
    read('supabase/migrations/20261009_phase1_admin_reliability.sql'),
    read('src/app/api/admin/quotations/route.ts'),
    read('src/app/api/admin/quotations/[id]/route.ts'),
  ])
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.create_admin_quotation/)
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.update_admin_quotation/)
  assert.match(migration, /FOR UPDATE/)
  assert.match(migration, /DELETE FROM public\.quotation_items[\s\S]*INSERT INTO public\.quotation_items/)
  assert.match(migration, /DELETE FROM public\.quotation_leads[\s\S]*INSERT INTO public\.quotation_leads/)
  assert.match(createRoute, /rpc\('create_admin_quotation'/)
  assert.match(updateRoute, /rpc\('update_admin_quotation'/)
  assert.doesNotMatch(createRoute, /from\('quotations'\)\.insert/)
  assert.doesNotMatch(updateRoute, /from\('quotation_items'\)\.delete/)
})

test('lead detail has a read-only original enquiry section and tolerates absent enquiry data', async () => {
  const [route, page] = await Promise.all([
    read('src/app/api/admin/leads/[id]/route.ts'),
    read('src/app/(en)/admin/(protected)/leads/[id]/page.tsx'),
  ])
  assert.match(route, /celebration_enquiry_services/)
  assert.match(route, /enquiryServices/)
  assert.match(page, /Original celebration enquiry/)
  assert.match(page, /\{enquiry &&/)
  assert.match(page, /Requested services/)
  assert.match(page, /Submitted mobile/)
  assert.match(page, /Submitted email/)
})

test('quotation PDF continues to consume persisted quotation snapshots and linked leads', async () => {
  const pdfRoute = await read('src/app/api/admin/quotations/[id]/pdf/route.ts')
  assert.match(pdfRoute, /requireActiveAdmin\(\)/)
  assert.match(pdfRoute, /quotation_items'\)\.select\('service_name, quantity, unit_price, line_total'/)
  assert.match(pdfRoute, /quotation_leads'\)\.select\('lead_id'\)/)
  assert.match(pdfRoute, /Content-Type': 'application\/pdf'/)
})
