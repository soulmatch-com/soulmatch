import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { celebrationEnquiryApiSchema } from '../src/lib/validations/celebration-enquiry-api.schema.ts'
import {
  buildPlanV2ServiceCodes,
  buildPlanV2Submission,
  mapPlanV2ArrangementPreference,
  mapPlanV2GuestCountRange,
  resolvePlanV2ServiceIds,
} from '../src/lib/celebrations/plan-v2-submission.ts'
import { toCelebrationRpcArgs } from '../src/lib/celebrations/enquiry-submission.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const uuid = (n) => {
  const digit = String(n % 10)
  return `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`
}
const service = (code, n) => ({ id: uuid(n), code, name: code, description: `${code} description`, icon: 'complete', display_order: n })
const services = [
  'vadhyar',
  'pooja_materials',
  'marriage_hall',
  'catering',
  'accommodation',
  'photography',
  'videography',
  'decoration',
  'nadaswaram',
  'transportation',
  'return_gifts',
].map((code, index) => service(code, index + 1))
const details = {
  preferredDate: '2027-01-01',
  alternativeDate: '2027-01-02',
  travellingFrom: 'Chennai',
  additionalRequirements: 'Wheelchair access',
  husbandName: 'Raman',
  wifeName: 'Lakshmi',
  husbandDob: '1960-01-01',
  wifeDob: '1964-02-02',
  contactName: 'Anand',
  mobile: '+91 98765 43210',
  email: '',
  relationship: 'Son',
  preferredContactMethod: 'phone',
  termsPrivacyAcknowledged: true,
}
const selection = (overrides = {}) => ({
  ceremony: '60th-marriage',
  guestPreset: '50',
  ceremonyDuration: 'two_sessions',
  planType: 'premium',
  selectedAddonCodes: ['transportation'],
  details,
  ...overrides,
})

test('Review displays plan, inclusions, add-ons and edit actions', async () => {
  const source = await read('src/components/celebrations/PlanReviewScreen.tsx')
  for (const text of ['Review Your Celebration Plan', 'Plan Inclusions', 'Optional Add-ons', 'Additional Requirements', 'Edit celebration plan', 'Edit optional add-ons', 'Edit event and couple details']) assert.match(source, new RegExp(text))
  assert.doesNotMatch(source, /Edit selected services|Starting Services/)
})

test('Plan V2 defaults to the 60th ceremony and 50 guests when no ceremony is preselected', async () => {
  const source = await read('src/components/celebrations/PlanV2Flow.tsx')
  assert.match(source, /ceremony: initialCeremony \?\? '60th-marriage'/)
  assert.match(source, /guestPreset: '50'/)
})

test('guest count maps to actual backend ranges and preserves exact count', () => {
  assert.equal(mapPlanV2GuestCountRange(19), 'below-20')
  assert.equal(mapPlanV2GuestCountRange(50), '20-50')
  assert.equal(mapPlanV2GuestCountRange(100), '51-100')
  assert.equal(mapPlanV2GuestCountRange(101), '100-plus')
  const result = buildPlanV2Submission(selection({ guestPreset: 'custom', customGuestCount: 75 }), services)
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.payload.expectedGuestCount, 75)
})

test('plan type, plan version and additional requirements persist through dedicated optional fields', () => {
  const result = buildPlanV2Submission(selection({ planType: 'basic' }), services)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.payload.planType, 'basic')
  assert.equal(result.payload.planVersion, 1)
  assert.equal(result.payload.specialRequirements, 'Wheelchair access')
  assert.equal(result.payload.notes, undefined)
  assert.equal(result.payload.otherServiceDetails, undefined)
  assert.equal(result.payload.ceremonyDuration, 'two_sessions')
  assert.equal('arrangementPreset' in result.payload, false)
})

test('Basic and Premium both map to complete-arrangement preference without complete_arrangement service', () => {
  assert.equal(mapPlanV2ArrangementPreference(), 'complete-arrangement')
  for (const planType of ['basic', 'premium']) {
    const codes = buildPlanV2ServiceCodes(selection({ planType, selectedAddonCodes: [] }))
    assert.doesNotMatch(codes.join(','), /complete_arrangement/)
  }
})

test('service IDs contain fixed plan services plus selected add-ons only', () => {
  const codes = buildPlanV2ServiceCodes(selection({ selectedAddonCodes: ['transportation', 'return_gifts'] }))
  for (const code of ['vadhyar', 'pooja_materials', 'marriage_hall', 'catering', 'accommodation', 'photography', 'videography', 'decoration', 'nadaswaram', 'transportation', 'return_gifts']) assert.ok(codes.includes(code))
  assert.ok(!codes.includes('complete_arrangement'))
  const result = buildPlanV2Submission(selection({ selectedAddonCodes: [] }), services)
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.payload.serviceIds.includes(uuid(10)), false)
})

test('missing active core or add-on service blocks submission safely', () => {
  assert.equal(resolvePlanV2ServiceIds(['vadhyar', 'missing'], services).ok, false)
  assert.equal(buildPlanV2Submission(selection(), services.filter((item) => item.code !== 'vadhyar')).ok, false)
})

test('legacy API payload remains valid and does not require V2 fields', () => {
  const legacy = celebrationEnquiryApiSchema.parse({
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
  })
  assert.equal(legacy.expectedGuestCount, undefined)
  assert.equal(legacy.planType, undefined)
  assert.equal(legacy.planVersion, undefined)
})

test('Plan V2 and legacy submissions both allow omitted couple details and map them to RPC nulls', () => {
  const optionalDetails = { ...details, husbandName: '', wifeName: '', husbandDob: '', wifeDob: '' }
  const v2 = buildPlanV2Submission(selection({ details: optionalDetails }), services)
  assert.equal(v2.ok, true)
  if (!v2.ok) return
  const v2Args = toCelebrationRpcArgs(v2.payload)
  assert.equal(v2Args.p_husband_name, null)
  assert.equal(v2Args.p_wife_name, null)
  assert.equal(v2Args.p_husband_dob, null)
  assert.equal(v2Args.p_wife_dob, null)
  const legacy = celebrationEnquiryApiSchema.parse({ ...v2.payload, husbandName: '', wifeName: '', husbandDob: '', wifeDob: '' })
  const legacyArgs = toCelebrationRpcArgs(legacy)
  assert.equal(legacyArgs.p_husband_name, null)
  assert.equal(legacyArgs.p_wife_name, null)
  assert.equal(legacyArgs.p_husband_dob, null)
  assert.equal(legacyArgs.p_wife_dob, null)
})

test('RPC args include optional final V2 fields while legacy values default to null', () => {
  const v2 = buildPlanV2Submission(selection(), services)
  assert.equal(v2.ok, true)
  if (!v2.ok) return
  const args = toCelebrationRpcArgs(v2.payload)
  assert.equal(args.p_expected_guest_count, 50)
  assert.equal(args.p_plan_type, 'premium')
  assert.equal(args.p_plan_version, 1)
  assert.equal(args.p_special_requirements, 'Wheelchair access')
  const legacy = toCelebrationRpcArgs(celebrationEnquiryApiSchema.parse({ ...v2.payload, expectedGuestCount: undefined, planType: undefined, planVersion: undefined, specialRequirements: undefined }))
  assert.equal(legacy.p_plan_type, null)
})

test('V2 submits through the existing API, Turnstile and rate-limit path', async () => {
  const [review, client, route] = await Promise.all([
    read('src/components/celebrations/PlanReviewScreen.tsx'),
    read('src/lib/celebrations/client-submission.ts'),
    read('src/app/api/celebrations/enquiries/route.ts'),
  ])
  assert.match(review, /submitCelebrationEnquiry\(built\.payload, botToken\)/)
  assert.match(review, /TurnstileChallenge/)
  assert.match(client, /\/api\/celebrations\/enquiries/)
  assert.match(route, /checkCelebrationEnquiryRateLimit/)
})

test('email includes Basic/Premium plan model and excludes obsolete/sensitive fields', async () => {
  const source = await read('src/lib/celebrations/email/booking-notification.ts')
  for (const label of ['Plan', 'Plan Version', 'Expected Guests', 'Session', 'Optional Add-ons', 'Special Requirements']) assert.match(source, new RegExp(label))
  assert.match(source, /Basic Plan/)
  assert.match(source, /Premium Plan/)
  assert.match(source, /one_session.*1 Session|1 Session.*one_session/)
  assert.match(source, /two_sessions.*2 Sessions|2 Sessions.*two_sessions/)
  assert.doesNotMatch(source, /Essential|Morning session only|DOB|Nakshatra|Rasi/)
})

test('migration adds nullable final V2 fields, checks, RPC grants and read-only verifier', async () => {
  const [migration, verification] = await Promise.all([
    read('supabase/migrations/add_plan_v2_enquiry_fields.sql'),
    read('supabase/migrations/verify_plan_v2_enquiry_fields.sql'),
  ])
  for (const field of ['expected_guest_count', 'plan_type', 'plan_version', 'special_requirements']) {
    assert.match(migration, new RegExp(field))
    assert.match(verification, new RegExp(field))
  }
  assert.match(`${migration}\n${verification}`, /ceremony_duration/)
  assert.match(`${migration}\n${verification}`, /one_session|two_sessions/)
  assert.doesNotMatch(`${migration}\n${verification}`, /arrangement_preset|essential/)
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.create_celebration_enquiry/)
  assert.doesNotMatch(verification, /INSERT|UPDATE|DELETE|ALTER|DROP|CREATE FUNCTION/)
})

test('feature flag remains off by default and corrected copy avoids pricing and temple authority claims', async () => {
  const source = `${await read('src/lib/celebrations/plan-v2.ts')}\n${await read('src/components/celebrations/ArrangementSelector.tsx')}\n${await read('src/components/celebrations/PlanReviewScreen.tsx')}`
  assert.match(source, /process\.env\.CELEBRATION_PLAN_V2_ENABLED === 'true'/)
  assert.doesNotMatch(source, /Book Now|Confirm Booking|Pay Now|Booking confirmed|₹|\$\d|GST|deposit|advance|official temple|authorized temple/i)
})
