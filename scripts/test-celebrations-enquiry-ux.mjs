import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { groupCelebrationServices } from '../src/lib/celebrations/service-presentation.ts'
import { createCelebrationEnquiryApiSchema } from '../src/lib/validations/celebration-enquiry-api.schema.ts'
import { createPlanV2DetailsSchema } from '../src/lib/celebrations/plan-v2-details.ts'
import { sanitizeIndianMobileInput, sanitizeLocationInput, sanitizePersonNameInput } from '../src/lib/celebrations/enquiry-validation.ts'
import { toCelebrationRpcArgs } from '../src/lib/celebrations/enquiry-submission.ts'

const celebrationEnquiryApiSchema = createCelebrationEnquiryApiSchema(new Date('2026-01-01T12:00:00Z'))
const payload = { celebrationType: '60th-marriage', husbandName: 'Synthetic Husband', wifeName: 'Synthetic Wife', husbandDob: '1960-01-01', wifeDob: '1962-02-02', preferredDate: '2027-02-01', guestCountRange: '20-50', travellingFrom: 'Synthetic City', arrangementPreference: 'need-guidance', contactName: 'Synthetic Contact', mobile: '9876543210', relationship: 'Son', preferredContactMethod: 'phone', serviceIds: [] }
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('optional couple dates accept missing or blank values without inventing dates', () => {
  for (const field of ['husbandDob', 'wifeDob']) {
    for (const value of [undefined, '']) assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, [field]: value }).success, true)
    assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, [field]: null }).success, false)
  }
  for (const value of [undefined, '', null]) assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, preferredDate: value }).success, false)
  const args = toCelebrationRpcArgs(celebrationEnquiryApiSchema.parse(payload))
  assert.equal(args.p_husband_dob, payload.husbandDob)
  assert.equal(args.p_wife_dob, payload.wifeDob)
  assert.equal(args.p_preferred_date, payload.preferredDate)
})

test('Unicode names are trimmed, limited to 50 characters, and couple names are optional', () => {
  for (const name of ['Raman', 'Raman Kumar', 'தமிழரசன்', 'ராஜ் குமார்', 'அ'.repeat(50)]) assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, husbandName: name }).success, true)
  const trimmed = celebrationEnquiryApiSchema.parse({ ...payload, husbandName: '  Raman Kumar  ', wifeName: '' })
  assert.equal(trimmed.husbandName, 'Raman Kumar')
  assert.equal(trimmed.wifeName, undefined)
  for (const name of ['அ'.repeat(50), 'Raman', 'Raman Kumar', 'தமிழரசன்']) assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, contactName: name }).success, true)
  for (const name of ['அ'.repeat(51), '12345', 'Raman2', 'Raman@', 'Raman 😀', '😀']) assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, contactName: name }).success, false)
  assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, husbandName: '' }).success, true)
  assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, wifeName: '' }).success, true)
  assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, contactName: '   ' }).success, false)
  assert.equal(sanitizePersonNameInput('Raman123 @😀 Kumar'), 'Raman Kumar')
  assert.equal(sanitizePersonNameInput('ராஜ் 123 குமார்'), 'ராஜ் குமார்')
})

test('Travelling From accepts real Unicode locations and rejects numeric or overlong values', () => {
  for (const location of ['Chennai', 'New Delhi', 'திருச்சி', 'Chennai - Nandambakkam', 'A'.repeat(50)]) assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, travellingFrom: location }).success, true)
  for (const location of ['12345', '600089', '123', '   ', 'A'.repeat(51)]) assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, travellingFrom: location }).success, false)
  assert.equal(sanitizeLocationInput('Chennai 600089'), 'Chennai ')
})

test('Plan V2 reuses the location, name, phone, and relationship validation contract', () => {
  const details = { preferredDate: '2027-02-01', travellingFrom: 'Chennai', contactName: 'Raman Kumar', mobile: '+91 98765 43210', email: '', relationship: 'Son', preferredContactMethod: 'phone', termsPrivacyAcknowledged: true }
  assert.equal(createPlanV2DetailsSchema(new Date('2026-01-01T12:00:00Z')).safeParse(details).success, true)
  assert.equal(createPlanV2DetailsSchema(new Date('2026-01-01T12:00:00Z')).safeParse({ ...details, travellingFrom: '12345' }).success, false)
  assert.equal(createPlanV2DetailsSchema(new Date('2026-01-01T12:00:00Z')).safeParse({ ...details, contactName: 'Raman123' }).success, false)
})

test('Indian mobile formats normalize to a canonical ten-digit mobile number', () => {
  for (const value of ['9876543210', '+919876543210', '+91 98765 43210', '91 9876543210', '98765-43210']) {
    const parsed = celebrationEnquiryApiSchema.parse({ ...payload, mobile: value })
    assert.equal(parsed.mobile, '9876543210')
  }
  for (const value of ['5876543210', '1234567890', '987654321', '98765432100', 'abcdefghij', '98765abc10']) assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, mobile: value }).success, false)
  assert.equal(sanitizeIndianMobileInput('98765abc10'), '9876510')
})

test('relationship has a stable friendly required message', () => {
  for (const relationship of [undefined, '']) {
    const result = celebrationEnquiryApiSchema.safeParse({ ...payload, relationship })
    assert.equal(result.success, false)
    if (!result.success) {
      const message = result.error.flatten().fieldErrors.relationship?.[0]
      assert.equal(message, 'Please select your relationship to the couple.')
      assert.doesNotMatch(message ?? '', /Invalid input|expected string|received undefined/i)
    }
  }
  assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, relationship: 'Son' }).success, true)
})

test('required preferred date and mobile never expose Zod type errors', () => {
  for (const [field, message] of [['preferredDate', 'Please select a preferred ceremony date.'], ['mobile', 'Mobile number is required.']]) {
    const result = celebrationEnquiryApiSchema.safeParse({ ...payload, [field]: undefined })
    assert.equal(result.success, false)
    if (!result.success) {
      const error = result.error.flatten().fieldErrors[field]?.[0]
      assert.equal(error, message)
      assert.doesNotMatch(error ?? '', /Invalid input|expected string|received undefined/i)
    }
  }
})

test('omitted or blank optional date and astrology fields persist as null', () => {
  const fields = { alternativeDate: 'alternative_date', husbandNakshatra: 'husband_nakshatra', wifeNakshatra: 'wife_nakshatra', husbandRasi: 'husband_rasi', wifeRasi: 'wife_rasi' }
  for (const value of [undefined, '']) {
    const args = toCelebrationRpcArgs(celebrationEnquiryApiSchema.parse({ ...payload, ...Object.fromEntries(Object.keys(fields).map((field) => [field, value])) }))
    for (const column of Object.values(fields)) assert.equal(args[`p_${column}`], null)
  }
  for (const field of Object.keys(fields)) assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, [field]: null }).success, false)
})

test('supplied dates retain calendar, future DOB and alternative conflict checks', () => {
  for (const field of ['husbandDob', 'wifeDob', 'preferredDate', 'alternativeDate']) assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, [field]: '2027-02-30' }).success, false)
  assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, husbandDob: '2999-01-01' }).success, false)
  assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, husbandDob: '2020-01-01' }).success, false)
  assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, alternativeDate: payload.preferredDate }).success, false)
})

test('all seeded services appear once in presentation groups and retain DB content', async () => {
  const sql = await read('supabase/migrations/add_thirukadaiyur_celebrations.sql')
  const codes = [...sql.matchAll(/\('thirukadaiyur', '([^']+)'/g)].map((match) => match[1])
  const services = codes.map((code, index) => ({ id: `id-${index}`, code, name: `DB name ${index}`, description: `DB description ${index}`, icon: 'db-icon', display_order: index }))
  const grouped = groupCelebrationServices(services)
  assert.deepEqual(grouped.map(({ name, services }) => [name, services.length]), [['Ceremony Support', 5], ['Food & Celebration', 4], ['Stay & Travel', 2], ['Additional Arrangements', 3]])
  const flattened = grouped.flatMap(({ services }) => services)
  assert.equal(flattened.length, 14)
  for (const service of services) assert.equal(flattened.find(({ id }) => id === service.id), service)
})

test('stable codes determine grouping even when display names change', () => {
  const service = { id: 'id', code: 'catering', name: 'Accommodation', description: 'Changed by catalogue editor', icon: 'food', display_order: 1 }
  assert.equal(groupCelebrationServices([service])[0].name, 'Food & Celebration')
})

test('unknown future and prototype-like codes remain selectable catalogue objects in Other Services', () => {
  const services = ['future_service', 'toString', '__proto__'].map((code) => ({ id: code, code, name: 'Future DB name', description: 'Future DB description', icon: 'future-icon', display_order: 1 }))
  assert.deepEqual(groupCelebrationServices(services), [{ name: 'Other Services', services }])
  assert.deepEqual(groupCelebrationServices([]), [])
})

test('UI contains no sentinel persistence or invented response SLA', async () => {
  const form = await read('src/components/celebrations/CelebrationEnquiryForm.tsx')
  const summary = await read('src/components/celebrations/EnquirySummary.tsx')
  assert.doesNotMatch(form + summary, /1900-01-01|1970-01-01|within \d+|same.day response/i)
  assert.doesNotMatch(form, /setValue\('serviceIds'|supabase\.from|\.rpc\(/)
})

test('migration makes couple fields nullable while retaining preferred-date and canonical mobile checks', async () => {
  const sql = await read('supabase/migrations/make_celebration_couple_fields_optional.sql')
  for (const column of ['husband_name', 'wife_name', 'husband_dob', 'wife_dob']) assert.match(sql, new RegExp(`ALTER COLUMN ${column} DROP NOT NULL`))
  assert.match(sql, /p_preferred_date IS NULL/)
  assert.match(sql, /\^\[6-9\]\[0-9\]\{9\}\$/)
  assert.match(sql, /NULLIF\(btrim\(p_husband_name\), ''\)/)
})
