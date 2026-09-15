import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  celebrationEnquiryStatusUpdateSchema,
  celebrationEnquiryStatuses,
} from '../src/lib/validations/celebration-enquiry-status.schema.ts'
import { celebrationEnquiryApiSchema } from '../src/lib/validations/celebration-enquiry-api.schema.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const migrationPath = 'supabase/migrations/add_celebration_enquiry_status_history.sql'
const verificationPath = 'supabase/migrations/verify_celebration_enquiry_status_history.sql'
const uuid = (n) => {
  const digit = String(n % 10)
  return `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`
}
const validCustomerPayload = {
  celebrationType: '60th-marriage',
  husbandName: 'Raman',
  wifeName: 'Lakshmi',
  husbandDob: '1960-01-01',
  wifeDob: '1964-02-02',
  preferredDate: '2027-01-01',
  guestCountRange: '20-50',
  travellingFrom: 'Chennai',
  arrangementPreference: 'ceremony-food',
  contactName: 'Anand',
  mobile: '+91 98765 43210',
  relationship: 'Son',
  preferredContactMethod: 'phone',
  serviceIds: [uuid(1)],
}

test('valid statuses are exactly pending, contacted, confirmed and cancelled', () => {
  assert.deepEqual([...celebrationEnquiryStatuses], ['pending', 'contacted', 'confirmed', 'cancelled'])
  for (const status of celebrationEnquiryStatuses) {
    assert.equal(celebrationEnquiryStatusUpdateSchema.safeParse({ enquiryId: uuid(1), status, remarks: 'Valid remarks' }).success, true)
  }
})

test('new enquiry current status defaults to pending', async () => {
  const source = await read(migrationPath)
  assert.match(source, /ALTER COLUMN status SET DEFAULT 'pending'/)
  assert.match(source, /status, status_updated_at, status_updated_by[\s\S]+?'pending', NOW\(\), NULL/)
})

test('initial history concept is created for a new enquiry', async () => {
  const source = await read(migrationPath)
  assert.match(source, /INSERT INTO public\.celebration_enquiry_status_history/)
  assert.match(source, /NULL,\s+'pending',\s+'Enquiry submitted',\s+NULL,\s+v_created_at/)
})

test('pending to contacted is an allowed manual transition', () => {
  assert.equal(celebrationEnquiryStatusUpdateSchema.safeParse({ enquiryId: uuid(2), status: 'contacted', remarks: 'Spoke with customer and discussed requirements.' }).success, true)
})

test('contacted to confirmed is an allowed manual transition', () => {
  assert.equal(celebrationEnquiryStatusUpdateSchema.safeParse({ enquiryId: uuid(3), status: 'confirmed', remarks: 'Customer confirmed event date and arrangement.' }).success, true)
})

test('confirmed to cancelled is an allowed manual transition', () => {
  assert.equal(celebrationEnquiryStatusUpdateSchema.safeParse({ enquiryId: uuid(4), status: 'cancelled', remarks: 'Customer cancelled due to date change.' }).success, true)
})

test('remarks are required for status updates', () => {
  assert.equal(celebrationEnquiryStatusUpdateSchema.safeParse({ enquiryId: uuid(5), status: 'contacted' }).success, false)
})

test('whitespace-only remarks are rejected', () => {
  assert.equal(celebrationEnquiryStatusUpdateSchema.safeParse({ enquiryId: uuid(6), status: 'contacted', remarks: '   ' }).success, false)
})

test('remarks max length is enforced at 1000 characters', () => {
  assert.equal(celebrationEnquiryStatusUpdateSchema.safeParse({ enquiryId: uuid(7), status: 'contacted', remarks: 'a'.repeat(1000) }).success, true)
  assert.equal(celebrationEnquiryStatusUpdateSchema.safeParse({ enquiryId: uuid(7), status: 'contacted', remarks: 'a'.repeat(1001) }).success, false)
})

test('invalid status is rejected', () => {
  assert.equal(celebrationEnquiryStatusUpdateSchema.safeParse({ enquiryId: uuid(8), status: 'completed', remarks: 'Done' }).success, false)
})

test('same-status update is rejected in the database function', async () => {
  const source = await read(migrationPath)
  assert.match(source, /v_current_status IS NOT DISTINCT FROM p_new_status/)
  assert.match(source, /No status change detected/)
})

test('status update inserts history', async () => {
  const source = await read(migrationPath)
  assert.match(source, /INSERT INTO public\.celebration_enquiry_status_history[\s\S]+from_status[\s\S]+to_status[\s\S]+remarks[\s\S]+changed_by[\s\S]+changed_at/)
})

test('current status is updated after history is inserted', async () => {
  const source = await read(migrationPath)
  const insertIndex = source.indexOf('INSERT INTO public.celebration_enquiry_status_history')
  const updateIndex = source.indexOf('UPDATE public.celebration_enquiries', insertIndex)
  assert.ok(insertIndex > -1)
  assert.ok(updateIndex > insertIndex)
  assert.match(source, /SET\s+status = p_new_status,\s+status_updated_at = v_changed_at,\s+status_updated_by = p_changed_by/)
})

test('status and history are atomic by database function design', async () => {
  const source = await read(migrationPath)
  assert.match(source, /LANGUAGE plpgsql[\s\S]+SECURITY DEFINER/)
  assert.match(source, /FOR UPDATE/)
  assert.match(source, /RETURNING id INTO v_history_id[\s\S]+UPDATE public\.celebration_enquiries/)
})

test('changed_by cannot be arbitrary unverified client input', async () => {
  const [migration, service] = await Promise.all([
    read(migrationPath),
    read('src/lib/celebrations/admin-status.ts'),
  ])
  assert.match(migration, /FROM public\.admins[\s\S]+id = p_changed_by[\s\S]+is_active = TRUE/)
  assert.match(service, /requireActiveAdmin\(\)/)
  assert.match(service, /p_changed_by: authorization\.admin\.id/)
  assert.doesNotMatch(service, /changedBy|changed_by:\s*validation\.data/)
})

test('public customer enquiry schema does not allow customer-controlled status', () => {
  assert.equal(celebrationEnquiryApiSchema.safeParse({ ...validCustomerPayload, status: 'confirmed' }).success, false)
  assert.equal(celebrationEnquiryApiSchema.safeParse({ ...validCustomerPayload, statusUpdatedAt: '2027-01-01T00:00:00Z' }).success, false)
  assert.equal(celebrationEnquiryApiSchema.safeParse({ ...validCustomerPayload, statusUpdatedBy: uuid(9) }).success, false)
  assert.equal(celebrationEnquiryApiSchema.safeParse({ ...validCustomerPayload, statusHistory: [] }).success, false)
})

test('legacy enquiry submission remains valid', () => {
  assert.equal(celebrationEnquiryApiSchema.safeParse(validCustomerPayload).success, true)
})

test('V2 enquiry submission remains valid', () => {
  assert.equal(celebrationEnquiryApiSchema.safeParse({
    ...validCustomerPayload,
    expectedGuestCount: 75,
    planType: 'premium',
    planVersion: 1,
    ceremonyDuration: 'two_sessions',
    specialRequirements: 'Wheelchair access',
  }).success, true)
})

test('status history cannot be publicly written', async () => {
  const source = await read(migrationPath)
  assert.match(source, /ALTER TABLE public\.celebration_enquiry_status_history ENABLE ROW LEVEL SECURITY/)
  assert.match(source, /REVOKE ALL ON TABLE public\.celebration_enquiry_status_history FROM PUBLIC, anon, authenticated/)
  assert.match(source, /GRANT ALL ON TABLE public\.celebration_enquiry_status_history TO service_role/)
})

test('history FK uses internal enquiry UUID and not MYT reference string', async () => {
  const source = await read(migrationPath)
  assert.match(source, /enquiry_id UUID NOT NULL REFERENCES public\.celebration_enquiries\(id\)/)
  assert.doesNotMatch(source, /enquiry_reference[^_]/)
})

test('MYT enquiry reference functionality remains unchanged', async () => {
  const [referenceMigration, route] = await Promise.all([
    read('supabase/migrations/add_enquiry_reference.sql'),
    read('src/app/api/celebrations/enquiries/route.ts'),
  ])
  assert.match(referenceMigration, /NEW\.enquiry_reference := 'MYT-'/)
  assert.match(route, /enquiryReference: enquiry\.enquiry_reference/)
})

test('no customer-facing status was added', async () => {
  const [summary, planV2, client] = await Promise.all([
    read('src/components/celebrations/EnquirySummary.tsx'),
    read('src/components/celebrations/PlanV2Flow.tsx'),
    read('src/lib/celebrations/client-submission.ts'),
  ])
  assert.doesNotMatch(`${summary}\n${planV2}\n${client}`, /\bPending\b|\bContacted\b|\bConfirmed\b|\bCancelled\b/)
})

test('read-only verifier covers status foundation without mutations', async () => {
  const source = await read(verificationPath)
  for (const term of ['status_updated_at', 'status_updated_by', 'celebration_enquiry_status_history', 'update_celebration_enquiry_status', 'create_celebration_enquiry']) {
    assert.match(source, new RegExp(term))
  }
  assert.doesNotMatch(source, /\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bALTER\b|\bDROP\b|\bCREATE\b/i)
})
