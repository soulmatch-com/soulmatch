import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { celebrationEnquiryApiSchema } from '../src/lib/validations/celebration-enquiry-api.schema.ts'
import { submitCelebrationEnquiry } from '../src/lib/celebrations/client-submission.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const serviceId = '11111111-1111-4111-8111-111111111111'
function valid(overrides = {}) { return { celebrationType: '60th-marriage', husbandName: 'Raman', wifeName: 'Lakshmi', husbandDob: '1960-01-01', wifeDob: '1964-02-02', preferredDate: '2027-01-01', guestCountRange: '20-50', travellingFrom: 'Chennai', arrangementPreference: 'ceremony-food', contactName: 'Anand', mobile: '+65 9123 4567', email: '', relationship: 'Son', preferredContactMethod: 'phone', serviceIds: [serviceId], ...overrides } }
const parse = (overrides = {}) => celebrationEnquiryApiSchema.safeParse(valid(overrides))

test('valid form payload passes the shared schema', () => assert.equal(parse().success, true))
test('all ceremony values pass', () => { for (const celebrationType of ['60th-marriage', '70th-marriage', '80th-marriage', 'not-sure']) assert.equal(parse({ celebrationType }).success, true) })
test('required customer fields are enforced', () => { for (const field of ['husbandName', 'wifeName', 'travellingFrom', 'contactName', 'mobile', 'relationship']) assert.equal(parse({ [field]: ' ' }).success, false) })
test('future birth dates are rejected', () => assert.equal(parse({ wifeDob: '2999-01-01' }).success, false))
test('matching preferred and alternative dates are rejected', () => assert.equal(parse({ alternativeDate: '2027-01-01' }).success, false))
test('an empty optional alternative date is normalized', () => { const result = celebrationEnquiryApiSchema.parse(valid({ alternativeDate: '' })); assert.equal(result.alternativeDate, undefined) })
test('obviously invalid mobile text is rejected', () => assert.equal(parse({ mobile: 'telephone' }).success, false))
test('guidance allows zero services', () => assert.equal(parse({ arrangementPreference: 'need-guidance', serviceIds: [] }).success, true))
test('other arrangements require at least one service', () => assert.equal(parse({ serviceIds: [] }).success, false))
test('other service details are accepted without a fake service ID', () => assert.equal(parse({ otherServiceDetails: 'Wheelchair assistance' }).success, true))
test('email remains optional for phone and WhatsApp', () => { assert.equal(parse({ preferredContactMethod: 'phone', email: '' }).success, true); assert.equal(parse({ preferredContactMethod: 'whatsapp', email: '' }).success, true) })
test('email is required when email is preferred', () => assert.equal(parse({ preferredContactMethod: 'email', email: '' }).success, false))
test('valid email contact passes', () => assert.equal(parse({ preferredContactMethod: 'email', email: 'family@example.com' }).success, true))

test('submission sends normalized JSON to the route handler', async () => {
  let captured
  const request = async (url, init) => { captured = { url, init }; return new Response(JSON.stringify({ success: true, enquiryId: 'abc' }), { status: 201 }) }
  const result = await submitCelebrationEnquiry(celebrationEnquiryApiSchema.parse(valid()), request)
  assert.deepEqual(result, { ok: true, enquiryId: 'abc' }); assert.equal(captured.url, '/api/celebrations/enquiries'); assert.equal(captured.init.method, 'POST')
  const body = JSON.parse(captured.init.body); assert.deepEqual(body.serviceIds, [serviceId]); assert.equal('location' in body, false); assert.equal('status' in body, false)
})
test('400 response preserves safe field errors', async () => { const result = await submitCelebrationEnquiry(celebrationEnquiryApiSchema.parse(valid()), async () => new Response(JSON.stringify({ errors: { mobile: ['Enter a valid mobile number'] } }), { status: 400 })); assert.deepEqual(result, { ok: false, kind: 'validation', errors: { mobile: ['Enter a valid mobile number'] } }) })
test('413 response is distinguished', async () => assert.deepEqual(await submitCelebrationEnquiry(celebrationEnquiryApiSchema.parse(valid()), async () => new Response('{}', { status: 413 })), { ok: false, kind: 'too-large' }))
test('500 response is safely normalized', async () => assert.deepEqual(await submitCelebrationEnquiry(celebrationEnquiryApiSchema.parse(valid()), async () => new Response('database details', { status: 500 })), { ok: false, kind: 'server' }))
test('network failures are safely normalized', async () => assert.deepEqual(await submitCelebrationEnquiry(celebrationEnquiryApiSchema.parse(valid()), async () => { throw new Error('secret') }), { ok: false, kind: 'network' }))

test('plan page loads services and passes validated preselection to form', async () => { const source = await read('src/app/celebrations/thirukadaiyur/plan/page.tsx'); assert.match(source, /loadCelebrationServices\(\)/); assert.match(source, /isCeremonySlug\(value\)/); assert.match(source, /services=\{services\}/); assert.match(source, /initialCeremony=\{initialCeremony\}/); assert.match(source, /servicesAvailable=\{!failed\}/) })
test('form renders only service props and submits UUID values', async () => { const source = await read('src/components/celebrations/CelebrationEnquiryForm.tsx'); assert.match(source, /services\.map/); assert.match(source, /value=\{service\.id\}/); assert.doesNotMatch(source, /serviceOptions|requestableServices|celebrationServices/) })
test('preselected ceremony remains user-changeable', async () => { const source = await read('src/components/celebrations/CelebrationEnquiryForm.tsx'); assert.match(source, /celebrationType: initialCeremony/); assert.match(source, /type="radio"/); assert.match(source, /register\('celebrationType'\)/) })
test('complete arrangement has no automatic service-selection logic', async () => { const source = await read('src/components/celebrations/CelebrationEnquiryForm.tsx'); assert.match(source, /value="complete-arrangement"/); assert.doesNotMatch(source, /selectAll|setValue\('serviceIds'/) })
test('failed submission retains values and double submit is disabled', async () => { const source = await read('src/components/celebrations/CelebrationEnquiryForm.tsx'); assert.doesNotMatch(source, /reset\(/); assert.match(source, /disabled=\{isSubmitting\}/); assert.match(source, /Submitting…/) })
test('success uses the real returned enquiry ID', async () => { const source = await read('src/components/celebrations/CelebrationEnquiryForm.tsx'); assert.match(source, /setEnquiryId\(result\.enquiryId\)/); assert.match(source, /\{enquiryId\}/) })
test('obsolete production service identifiers are absent', async () => { const files = ['src/components/celebrations/CelebrationEnquiryForm.tsx', 'src/lib/celebrations.ts']; for (const file of files) assert.doesNotMatch(await read(file), /complete_package|priest_vadhyar|venue_preference|not_sure/) })
