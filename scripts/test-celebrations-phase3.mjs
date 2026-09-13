import assert from 'node:assert/strict'
import test from 'node:test'

import { celebrationEnquiryApiSchema } from '../src/lib/validations/celebration-enquiry-api.schema.ts'
import { persistCelebrationEnquiry, toCelebrationRpcArgs } from '../src/lib/celebrations/enquiry-submission.ts'
import { queryActiveCelebrationServices } from '../src/lib/celebrations/service-query.ts'

const serviceId = '11111111-1111-4111-8111-111111111111'
const secondServiceId = '22222222-2222-4222-8222-222222222222'

function validPayload(overrides = {}) {
  return {
    celebrationType: '60th-marriage', husbandName: 'Raman', wifeName: 'Lakshmi',
    husbandDob: '1960-01-01', wifeDob: '1964-02-02', preferredDate: '2027-01-01',
    guestCountRange: '20-50', travellingFrom: 'Chennai', arrangementPreference: 'ceremony-food', contactName: 'Anand',
    mobile: '+91 98765 43210', email: 'anand@example.com', relationship: 'Son',
    preferredContactMethod: 'phone', serviceIds: [serviceId], ...overrides,
  }
}

test('valid normalized payload passes', () => assert.equal(celebrationEnquiryApiSchema.safeParse(validPayload()).success, true))
test('invalid celebration type is rejected', () => assert.equal(celebrationEnquiryApiSchema.safeParse(validPayload({ celebrationType: '50th' })).success, false))
test('invalid service UUID is rejected', () => assert.equal(celebrationEnquiryApiSchema.safeParse(validPayload({ serviceIds: ['invalid'] })).success, false))
test('missing contact name is rejected', () => assert.equal(celebrationEnquiryApiSchema.safeParse(validPayload({ contactName: ' ' })).success, false))
test('invalid optional email is rejected', () => assert.equal(celebrationEnquiryApiSchema.safeParse(validPayload({ email: 'bad-email' })).success, false))
test('email is required when it is the preferred contact method', () => assert.equal(celebrationEnquiryApiSchema.safeParse(validPayload({ email: '', preferredContactMethod: 'email' })).success, false))
test('future date of birth is rejected', () => assert.equal(celebrationEnquiryApiSchema.safeParse(validPayload({ husbandDob: '2999-01-01' })).success, false))
test('invalid guest range is rejected', () => assert.equal(celebrationEnquiryApiSchema.safeParse(validPayload({ guestCountRange: 'many' })).success, false))
test('invalid arrangement preference is rejected', () => assert.equal(celebrationEnquiryApiSchema.safeParse(validPayload({ arrangementPreference: 'anything' })).success, false))
test('zero services with guidance is accepted', () => assert.equal(celebrationEnquiryApiSchema.safeParse(validPayload({ arrangementPreference: 'need-guidance', serviceIds: [] })).success, true))
test('zero services without guidance is rejected', () => assert.equal(celebrationEnquiryApiSchema.safeParse(validPayload({ serviceIds: [] })).success, false))
test('duplicate service IDs are normalized', () => {
  const result = celebrationEnquiryApiSchema.parse(validPayload({ serviceIds: [serviceId, serviceId, secondServiceId] }))
  assert.deepEqual(result.serviceIds, [serviceId, secondServiceId])
})
test('client location and status fields are rejected', () => {
  assert.equal(celebrationEnquiryApiSchema.safeParse(validPayload({ location: 'other', status: 'completed' })).success, false)
})
test('RPC arguments force location and contain no status', () => {
  const args = toCelebrationRpcArgs(celebrationEnquiryApiSchema.parse(validPayload()))
  assert.equal(args.p_location, 'thirukadaiyur')
  assert.equal('status' in args, false)
  assert.equal(args.p_contact_name, 'Anand')
  assert.deepEqual(args.p_service_ids, [serviceId])
})
test('RPC success returns only the created enquiry ID', async () => {
  const client = { rpc: async (name, args) => {
    assert.equal(name, 'create_celebration_enquiry')
    assert.equal(args.p_location, 'thirukadaiyur')
    return { data: '33333333-3333-4333-8333-333333333333', error: null }
  } }
  assert.deepEqual(await persistCelebrationEnquiry(client, celebrationEnquiryApiSchema.parse(validPayload())), {
    success: true, enquiryId: '33333333-3333-4333-8333-333333333333',
  })
})
test('RPC errors expose only a code to route orchestration', async () => {
  const client = { rpc: async () => ({ data: null, error: { code: '22023', message: 'private detail' } }) }
  assert.deepEqual(await persistCelebrationEnquiry(client, celebrationEnquiryApiSchema.parse(validPayload())), {
    success: false, errorCode: '22023',
  })
})
test('service query applies public fields, location, active filter, and ascending order', async () => {
  const calls = []
  const result = [{ id: serviceId, code: 'vadhyar', name: 'Vadhyar / Priest', description: null, icon: 'priest', display_order: 1 }]
  const query = {
    select(fields) { calls.push(['select', fields]); return this },
    eq(field, value) { calls.push(['eq', field, value]); return this },
    async order(field, options) { calls.push(['order', field, options]); return { data: result, error: null } },
  }
  const client = { from(table) { calls.push(['from', table]); return query } }
  assert.deepEqual(await queryActiveCelebrationServices(client, 'thirukadaiyur'), result)
  assert.deepEqual(calls, [
    ['from', 'celebration_services'],
    ['select', 'id, code, name, description, icon, display_order'],
    ['eq', 'location', 'thirukadaiyur'],
    ['eq', 'is_active', true],
    ['order', 'display_order', { ascending: true }],
  ])
})
test('service query converts database errors to a safe application error', async () => {
  const query = { select() { return this }, eq() { return this }, async order() { return { data: null, error: { code: 'DB_TEST', message: 'private detail' } } } }
  const client = { from() { return query } }
  const originalError = console.error
  console.error = () => {}
  try {
    await assert.rejects(() => queryActiveCelebrationServices(client, 'thirukadaiyur'), /Unable to load celebration services/)
  } finally {
    console.error = originalError
  }
})
