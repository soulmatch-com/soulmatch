import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { celebrationEnquiryStatusUpdateSchema } from '../src/lib/validations/celebration-enquiry-status.schema.ts'
import {
  getHistoryChangedByLabel,
  getHistoryTransitionLabel,
  getStatusLabel,
} from '../src/lib/celebrations/admin-enquiry-detail-core.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const uuid = '11111111-1111-4111-8111-111111111111'

test('detail route uses internal UUID while MYT reference is the visible identifier', async () => {
  const page = await read('src/app/(en)/admin/celebration-enquiries/[id]/page.tsx')
  assert.match(page, /params: Promise<\{ id: string \}>/)
  assert.match(page, /enquiry\.enquiry_reference \?\? '-'/)
  assert.doesNotMatch(page, />\{enquiry\.id\}</)
})

test('detail query requires an active admin and loads celebration details', async () => {
  const service = await read('src/lib/celebrations/admin-enquiry-detail.ts')
  assert.match(service, /requireActiveAdmin\(\)/)
  assert.match(service, /createAdminClient\(\)/)
  assert.match(service, /husband_name, wife_name, husband_dob, wife_dob/)
  assert.match(service, /special_requirements/)
})

test('detail page only displays V2 plan when plan_type is present and uses friendly service names', async () => {
  const [page, service] = await Promise.all([
    read('src/app/(en)/admin/celebration-enquiries/[id]/page.tsx'),
    read('src/lib/celebrations/admin-enquiry-detail.ts'),
  ])
  assert.match(page, /getPlanLabel\(enquiry\.plan_type\)/)
  assert.match(service, /celebration_services\(id, name\)/)
  assert.match(page, /service\.name/)
  assert.doesNotMatch(page, /service\.id\}<\/li>/)
})

test('sensitive detail data remains in the authenticated admin detail page', async () => {
  const [page, route] = await Promise.all([
    read('src/app/(en)/admin/celebration-enquiries/[id]/page.tsx'),
    read('src/app/api/celebrations/enquiries/route.ts'),
  ])
  assert.match(page, /Couple Details/)
  assert.match(page, /Contact Details/)
  assert.doesNotMatch(route, /status_history|statusUpdatedAt|statusUpdatedBy/)
})

for (const [from, status] of [['pending', 'contacted'], ['contacted', 'confirmed'], ['confirmed', 'cancelled'], ['cancelled', 'pending']]) {
  test(`${from} to ${status} is allowed with valid remarks`, () => {
    assert.equal(celebrationEnquiryStatusUpdateSchema.safeParse({ enquiryId: uuid, status, remarks: 'Operational update' }).success, true)
  })
}

test('same status remains rejected by the atomic database RPC', async () => {
  const migration = await read('supabase/migrations/add_celebration_enquiry_status_history.sql')
  assert.match(migration, /v_current_status IS NOT DISTINCT FROM p_new_status/)
  assert.match(migration, /No status change detected/)
})

test('invalid statuses and invalid remarks are rejected before mutation', () => {
  assert.equal(celebrationEnquiryStatusUpdateSchema.safeParse({ enquiryId: uuid, status: 'completed', remarks: 'Done' }).success, false)
  assert.equal(celebrationEnquiryStatusUpdateSchema.safeParse({ enquiryId: uuid, status: 'confirmed', remarks: '   ' }).success, false)
  assert.equal(celebrationEnquiryStatusUpdateSchema.safeParse({ enquiryId: uuid, status: 'confirmed', remarks: 'a'.repeat(1001) }).success, false)
})

test('verified admin identity is resolved server-side and never accepted from browser input', async () => {
  const [service, route, form] = await Promise.all([
    read('src/lib/celebrations/admin-status.ts'),
    read('src/app/api/admin/celebration-enquiries/[id]/status/route.ts'),
    read('src/components/admin/CelebrationEnquiryStatusForm.tsx'),
  ])
  assert.match(service, /requireActiveAdmin\(\)/)
  assert.match(service, /p_changed_by: authorization\.admin\.id/)
  assert.doesNotMatch(route, /changed_by|changedBy/)
  assert.doesNotMatch(form, /changed_by|changedBy|adminId|adminEmail/)
})

test('status form prevents double submission and clears stale remarks after success', async () => {
  const form = await read('src/components/admin/CelebrationEnquiryStatusForm.tsx')
  assert.match(form, /setIsSubmitting\(true\)/)
  assert.match(form, /disabled=\{isSubmitting\}/)
  assert.match(form, /setRemarks\(''\)/)
  assert.match(form, /setStatus\(''\)/)
  assert.match(form, /router\.refresh\(\)/)
})

test('historical NULL status displays Not Set and first managed update can choose any valid status', async () => {
  const migration = await read('supabase/migrations/add_celebration_enquiry_status_history.sql')
  assert.equal(getStatusLabel(null), 'Not Set')
  assert.equal(celebrationEnquiryStatusUpdateSchema.safeParse({ enquiryId: uuid, status: 'contacted', remarks: 'First managed update' }).success, true)
  assert.match(migration, /v_current_status IS NOT DISTINCT FROM p_new_status/)
  assert.match(migration, /from_status[\s\S]+v_current_status/)
  assert.doesNotMatch(migration, /COALESCE\(v_current_status, 'pending'\)/)
})

test('history query is private, limited to the selected UUID, and newest first', async () => {
  const service = await read('src/lib/celebrations/admin-enquiry-detail.ts')
  assert.match(service, /from\('celebration_enquiry_status_history'\)/)
  assert.match(service, /\.eq\('enquiry_id', enquiryId\)/)
  assert.match(service, /\.order\('changed_at', \{ ascending: false \}\)/)
  assert.match(service, /createAdminClient\(\)/)
})

test('history transitions, plain-text remarks, and safe admin identities display correctly', async () => {
  const page = await read('src/app/(en)/admin/celebration-enquiries/[id]/page.tsx')
  assert.equal(getHistoryTransitionLabel({ from_status: 'pending', to_status: 'contacted' }), 'Pending to Contacted')
  assert.equal(getHistoryTransitionLabel({ from_status: null, to_status: 'pending' }), 'Enquiry Submitted')
  assert.equal(getHistoryChangedByLabel({ changed_by: { name: 'Admin Name', email: 'admin@example.com' } }), 'Admin Name')
  assert.equal(getHistoryChangedByLabel({ changed_by: null }), 'System')
  assert.match(page, /whitespace-pre-wrap text-slate-700/)
  assert.doesNotMatch(page, /dangerouslySetInnerHTML|Edit history|Delete history/)
})

test('empty history, atomic RPC, and public mutation protections remain intact', async () => {
  const [page, migration, statusService, form] = await Promise.all([
    read('src/app/(en)/admin/celebration-enquiries/[id]/page.tsx'),
    read('supabase/migrations/add_celebration_enquiry_status_history.sql'),
    read('src/lib/celebrations/admin-status.ts'),
    read('src/components/admin/CelebrationEnquiryStatusForm.tsx'),
  ])
  assert.match(page, /No status history recorded yet\./)
  assert.match(migration, /FOR UPDATE/)
  assert.match(migration, /INSERT INTO public\.celebration_enquiry_status_history[\s\S]+UPDATE public\.celebration_enquiries/)
  assert.match(statusService, /client\.rpc\('update_celebration_enquiry_status'/)
  assert.match(migration, /REVOKE ALL ON TABLE public\.celebration_enquiry_status_history FROM PUBLIC, anon, authenticated/)
  assert.doesNotMatch(form, /SUPABASE_SERVICE_ROLE_KEY|createAdminClient/)
})
