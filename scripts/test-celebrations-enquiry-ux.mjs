import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { groupCelebrationServices } from '../src/lib/celebrations/service-presentation.ts'
import { celebrationEnquiryApiSchema } from '../src/lib/validations/celebration-enquiry-api.schema.ts'
import { toCelebrationRpcArgs } from '../src/lib/celebrations/enquiry-submission.ts'

const payload = { celebrationType: '60th-marriage', husbandName: 'Synthetic Husband', wifeName: 'Synthetic Wife', husbandDob: '1960-01-01', wifeDob: '1962-02-02', preferredDate: '2027-02-01', guestCountRange: '20-50', travellingFrom: 'Synthetic City', arrangementPreference: 'need-guidance', contactName: 'Synthetic Contact', mobile: '+10000000000', relationship: 'Son', preferredContactMethod: 'phone', serviceIds: [] }
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('mandatory dates reject missing, blank and null values without inventing dates', () => {
  for (const field of ['husbandDob', 'wifeDob', 'preferredDate']) {
    for (const value of [undefined, '', null]) assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, [field]: value }).success, false)
  }
  const args = toCelebrationRpcArgs(celebrationEnquiryApiSchema.parse(payload))
  assert.equal(args.p_husband_dob, payload.husbandDob)
  assert.equal(args.p_wife_dob, payload.wifeDob)
  assert.equal(args.p_preferred_date, payload.preferredDate)
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
  assert.equal(celebrationEnquiryApiSchema.safeParse({ ...payload, alternativeDate: payload.preferredDate }).success, false)
})

test('all seeded services appear once in presentation groups and retain DB content', async () => {
  const sql = await read('supabase/migrations/add_thirukadaiyur_celebrations.sql')
  const codes = [...sql.matchAll(/\('thirukadaiyur', '([^']+)'/g)].map((match) => match[1])
  const services = codes.map((code, index) => ({ id: `id-${index}`, code, name: `DB name ${index}`, description: `DB description ${index}`, icon: 'db-icon', display_order: index }))
  const grouped = groupCelebrationServices(services)
  assert.deepEqual(grouped.map(({ name, services }) => [name, services.length]), [['Ceremony', 5], ['Food & Celebration', 4], ['Stay & Travel', 2], ['Additional Support', 3]])
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

test('existing SQL date restrictions remain explicit and optional fields remain nullable', async () => {
  const sql = await read('supabase/migrations/add_thirukadaiyur_celebrations.sql')
  for (const column of ['husband_dob', 'wife_dob', 'preferred_date']) assert.match(sql, new RegExp(`${column} DATE NOT NULL`))
  assert.match(sql, /p_husband_dob IS NULL OR p_wife_dob IS NULL OR p_preferred_date IS NULL/)
  for (const column of ['husband_nakshatra', 'wife_nakshatra', 'husband_rasi', 'wife_rasi']) assert.match(sql, new RegExp(`p_${column} TEXT DEFAULT NULL`))
})
