import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  applyUpcomingCelebrationEventsQuery,
  getCeremonyDurationLabel,
  getGuestLabel,
  getPlanLabel,
  normalizeCelebrationEnquiriesListParams,
  normalizeCelebrationEnquiryView,
} from '../src/lib/celebrations/admin-enquiries-core.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

class QueryRecorder {
  operations = []

  gte(column, value) { this.operations.push(['gte', column, value]); return this }
  eq(column, value) { this.operations.push(['eq', column, value]); return this }
  order(column, options) { this.operations.push(['order', column, options]); return this }
  range(from, to) { this.operations.push(['range', from, to]); return Promise.resolve({ data: [], error: null, count: 0 }) }
}

async function recordUpcoming(input = {}, today = '2026-09-15') {
  const query = new QueryRecorder()
  await applyUpcomingCelebrationEventsQuery(query, normalizeCelebrationEnquiriesListParams(input), today)
  return query.operations
}

test('only confirmed enquiries qualify; pending, contacted, and cancelled are excluded by the database query', async () => {
  const operations = await recordUpcoming()
  assert.ok(operations.some((operation) => operation[0] === 'eq' && operation[1] === 'status' && operation[2] === 'confirmed'))
  assert.equal(operations.some((operation) => operation[0] === 'eq' && ['pending', 'contacted', 'cancelled'].includes(operation[2])), false)
})

test('India today and future events are included while past and NULL dates are excluded server-side', async () => {
  const operations = await recordUpcoming({}, '2026-09-15')
  assert.ok(operations.some((operation) => operation[0] === 'gte' && operation[1] === 'preferred_date' && operation[2] === '2026-09-15'))
  assert.equal(operations.some((operation) => operation[0] === 'lt'), false)
  assert.equal(operations.some((operation) => operation[0] === 'is' && operation[1] === 'preferred_date'), false)
})

test('Upcoming Events sorts nearest event first with deterministic created-at secondary ordering', async () => {
  assert.deepEqual((await recordUpcoming()).filter((operation) => operation[0] === 'order'), [
    ['order', 'preferred_date', { ascending: true }],
    ['order', 'created_at', { ascending: true }],
  ])
})

test('Upcoming Events reuses shared bounded server-side pagination', async () => {
  assert.ok((await recordUpcoming({ page: '3', pageSize: '20' })).some((operation) => operation[0] === 'range' && operation[1] === 40 && operation[2] === 59))
  assert.equal(normalizeCelebrationEnquiriesListParams({ pageSize: '999' }).pageSize, 50)
})

test('status changes automatically determine eligibility without an event copy table', async () => {
  const [service, statusService] = await Promise.all([
    read('src/lib/celebrations/admin-enquiries.ts'),
    read('src/lib/celebrations/admin-status.ts'),
  ])
  assert.match(service, /from\('celebration_enquiries'\)/)
  assert.match(service, /getUpcomingCelebrationEvents/)
  assert.doesNotMatch(service, /from\('(events|upcoming_events|calendar_events)'\)/)
  assert.match(statusService, /update_celebration_enquiry_status/)
})

test('tabs default to Enquiries, support Upcoming Events, and reject invalid view values', () => {
  assert.equal(normalizeCelebrationEnquiryView({}), 'enquiries')
  assert.equal(normalizeCelebrationEnquiryView({ view: 'upcoming' }), 'upcoming')
  assert.equal(normalizeCelebrationEnquiryView({ view: 'unexpected' }), 'enquiries')
})

test('Upcoming Events has no date or status filters and tab switching resets its page', async () => {
  const page = await read('src/app/(en)/admin/celebration-enquiries/page.tsx')
  assert.match(page, /function buildUpcomingHref\(page = 1\)/)
  assert.match(page, /href=\{buildUpcomingHref\(\)\}/)
  assert.match(page, /activeView === 'upcoming'/)
  assert.match(page, /<CelebrationEnquiryFilters status=\{params\.status\} dateScope=\{params\.dateScope\}/)
})

test('Upcoming table uses customer-facing reference, friendly legacy/V2 fields, session, and detail navigation', async () => {
  const page = await read('src/app/(en)/admin/celebration-enquiries/page.tsx')
  assert.match(page, /Event Date/)
  assert.match(page, /Session/)
  assert.match(page, /event\.enquiry_reference \?\? '-'/)
  assert.match(page, /getCeremonyDurationLabel\(event\.ceremony_duration\)/)
  assert.match(page, /href=\{`\/admin\/celebration-enquiries\/\$\{event\.id\}`\}/)
  assert.doesNotMatch(page, />\{event\.id\}</)
  assert.equal(getGuestLabel({ expected_guest_count: 75, guest_count_range: '20-50' }), '75')
  assert.equal(getGuestLabel({ expected_guest_count: null, guest_count_range: '51-100' }), '51-100')
  assert.equal(getPlanLabel('basic'), 'Basic')
  assert.equal(getPlanLabel(null), '-')
  assert.equal(getCeremonyDurationLabel('two_sessions'), '2 Sessions')
  assert.equal(getCeremonyDurationLabel(null), '-')
})

test('Upcoming query is admin-only, server-side, and excludes private customer fields', async () => {
  const [service, page, publicRoute] = await Promise.all([
    read('src/lib/celebrations/admin-enquiries.ts'),
    read('src/app/(en)/admin/celebration-enquiries/page.tsx'),
    read('src/app/api/celebrations/enquiries/route.ts'),
  ])
  assert.match(service, /requireActiveAdmin\(\)/)
  assert.match(service, /createAdminClient\(\)/)
  assert.match(service, /count: 'exact'/)
  assert.doesNotMatch(page, /SUPABASE_SERVICE_ROLE_KEY|createAdminClient|service_role|husband_dob|wife_dob|nakshatra|rasi|email|special_requirements|notes|remarks/)
  assert.doesNotMatch(publicRoute, /getUpcomingCelebrationEvents|upcoming/)
})

test('existing status/preferred-date index supports the upcoming query without another migration', async () => {
  const migration = await read('supabase/migrations/add_celebration_enquiry_status_history.sql')
  assert.match(migration, /idx_celebration_enquiries_status_preferred_date[\s\S]+\(status, preferred_date\)/)
})
