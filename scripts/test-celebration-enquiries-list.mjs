import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  applyCelebrationEnquiriesListQuery,
  DEFAULT_CELEBRATION_ENQUIRY_PAGE_SIZE,
  getGuestLabel,
  getPlanLabel,
  getStatusLabel,
  normalizeCelebrationEnquiriesListParams,
} from '../src/lib/celebrations/admin-enquiries-core.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

class QueryRecorder {
  operations = []

  gte(column, value) {
    this.operations.push(['gte', column, value])
    return this
  }

  lt(column, value) {
    this.operations.push(['lt', column, value])
    return this
  }

  eq(column, value) {
    this.operations.push(['eq', column, value])
    return this
  }

  order(column, options) {
    this.operations.push(['order', column, options])
    return this
  }

  range(from, to) {
    this.operations.push(['range', from, to])
    return Promise.resolve({ data: [], error: null, count: 0 })
  }
}

async function recordQuery(input = {}, today = '2026-09-15') {
  const params = normalizeCelebrationEnquiriesListParams(input)
  const query = new QueryRecorder()
  await applyCelebrationEnquiriesListQuery(query, params, today)
  return query.operations
}

test('default dateScope is current', () => {
  assert.equal(normalizeCelebrationEnquiriesListParams({}).dateScope, 'current')
})

test('default query excludes preferred_date before India today', async () => {
  assert.deepEqual(await recordQuery(), [
    ['gte', 'preferred_date', '2026-09-15'],
    ['order', 'created_at', { ascending: false }],
    ['range', 0, 19],
  ])
})

test('today is included in Current / Future through gte', async () => {
  const operations = await recordQuery({ dateScope: 'current' }, '2026-09-15')
  assert.ok(operations.some((operation) => operation[0] === 'gte' && operation[1] === 'preferred_date' && operation[2] === '2026-09-15'))
})

test('future is included in Current / Future by lower-bound-only query', async () => {
  const operations = await recordQuery({ dateScope: 'current' }, '2026-09-15')
  assert.equal(operations.some((operation) => operation[0] === 'lt' && operation[1] === 'preferred_date'), false)
})

test('Past filter queries only dates before today', async () => {
  assert.deepEqual(await recordQuery({ dateScope: 'past' }), [
    ['lt', 'preferred_date', '2026-09-15'],
    ['order', 'created_at', { ascending: false }],
    ['range', 0, 19],
  ])
})

test('All date scope applies no preferred_date boundary', async () => {
  const operations = await recordQuery({ dateScope: 'all' })
  assert.equal(operations.some((operation) => ['gte', 'lt'].includes(operation[0]) && operation[1] === 'preferred_date'), false)
})

test('sorting is created_at descending', async () => {
  const operations = await recordQuery()
  assert.ok(operations.some((operation) => operation[0] === 'order' && operation[1] === 'created_at' && operation[2].ascending === false))
})

test('latest submitted enquiry appears first by relying on created_at DESC', async () => {
  const page = await read('src/app/(en)/admin/celebration-enquiries/page.tsx')
  assert.match(page, /Latest enquiries are shown first/)
  assert.deepEqual((await recordQuery()).filter((operation) => operation[0] === 'order'), [['order', 'created_at', { ascending: false }]])
})

for (const status of ['pending', 'contacted', 'confirmed', 'cancelled']) {
  test(`status ${status} filter applies ${status}`, async () => {
    const operations = await recordQuery({ status })
    assert.ok(operations.some((operation) => operation[0] === 'eq' && operation[1] === 'status' && operation[2] === status))
  })
}

test('All status does not add a status condition', async () => {
  const operations = await recordQuery({ status: 'all' })
  assert.equal(operations.some((operation) => operation[0] === 'eq' && operation[1] === 'status'), false)
})

test('NULL historical statuses remain visible under All where date matches', async () => {
  const operations = await recordQuery({ status: 'all', dateScope: 'all' })
  assert.equal(operations.some((operation) => operation[0] === 'eq' && operation[1] === 'status'), false)
})

test('NULL status is not converted to pending', () => {
  assert.equal(getStatusLabel(null), 'Not Set')
})

test('default page is 1', () => {
  assert.equal(normalizeCelebrationEnquiriesListParams({}).page, 1)
})

test('default page size is 20', () => {
  assert.equal(normalizeCelebrationEnquiriesListParams({}).pageSize, DEFAULT_CELEBRATION_ENQUIRY_PAGE_SIZE)
})

test('invalid page is safely handled', () => {
  assert.equal(normalizeCelebrationEnquiriesListParams({ page: '-10' }).page, 1)
  assert.equal(normalizeCelebrationEnquiriesListParams({ page: 'abc' }).page, 1)
})

test('page size is bounded', () => {
  assert.equal(normalizeCelebrationEnquiriesListParams({ pageSize: '999' }).pageSize, 50)
})

test('query uses server-side range pagination', async () => {
  const operations = await recordQuery({ page: '3', pageSize: '20' })
  assert.ok(operations.some((operation) => operation[0] === 'range' && operation[1] === 40 && operation[2] === 59))
})

test('matching total count is returned by exact count query', async () => {
  const service = await read('src/lib/celebrations/admin-enquiries.ts')
  assert.match(service, /count: 'exact'/)
  assert.match(service, /total: count \?\? 0/)
})

test('changing filters resets page to 1', async () => {
  const source = await read('src/components/admin/CelebrationEnquiryFilters.tsx')
  assert.match(source, /params\.set\('page', '1'\)/)
})

test('list uses server admin path', async () => {
  const service = await read('src/lib/celebrations/admin-enquiries.ts')
  assert.match(service, /requireActiveAdmin\(\)/)
  assert.match(service, /createAdminClient\(\)/)
})

test('service role key is not exposed to client filter component or page', async () => {
  const [page, filters] = await Promise.all([
    read('src/app/(en)/admin/celebration-enquiries/page.tsx'),
    read('src/components/admin/CelebrationEnquiryFilters.tsx'),
  ])
  assert.doesNotMatch(`${page}\n${filters}`, /SUPABASE_SERVICE_ROLE_KEY|createAdminClient|service_role/i)
})

test('unauthorized access is blocked through existing admin guard', async () => {
  const [service, detail] = await Promise.all([
    read('src/lib/celebrations/admin-enquiries.ts'),
    read('src/app/(en)/admin/celebration-enquiries/[id]/page.tsx'),
  ])
  assert.match(service, /requireActiveAdmin\(\)/)
  assert.match(detail, /requireActiveAdmin\(\)/)
  assert.match(detail, /redirect\('\/admin\/login'\)/)
})

test('public API is not used for admin list data', async () => {
  const page = await read('src/app/(en)/admin/celebration-enquiries/page.tsx')
  assert.doesNotMatch(page, /\/api\/celebrations\/enquiries|fetch\(/)
})

test('no customer PII beyond approved list fields is rendered', async () => {
  const source = `${await read('src/app/(en)/admin/celebration-enquiries/page.tsx')}\n${await read('src/lib/celebrations/admin-enquiries.ts')}`
  assert.doesNotMatch(source, /husband_dob|wife_dob|nakshatra|rasi|special_requirements|notes|email|status_history|remarks/)
})

test('MYT enquiry reference is preferred', async () => {
  const source = await read('src/app/(en)/admin/celebration-enquiries/page.tsx')
  assert.match(source, /enquiry\.enquiry_reference \?\? '-'/)
})

test('raw UUID is not displayed as customer reference', async () => {
  const source = await read('src/app/(en)/admin/celebration-enquiries/page.tsx')
  assert.doesNotMatch(source, />\{enquiry\.id\}</)
  assert.match(source, /href=\{`\/admin\/celebration-enquiries\/\$\{enquiry\.id\}`\}/)
})

test('Basic and Premium displayed only when actual plan_type exists', () => {
  assert.equal(getPlanLabel('basic'), 'Basic')
  assert.equal(getPlanLabel('premium'), 'Premium')
  assert.equal(getPlanLabel(null), '-')
})

test('exact expected guest count is preferred when available', () => {
  assert.equal(getGuestLabel({ expected_guest_count: 75, guest_count_range: '20-50' }), '75')
})

test('legacy guest range is used when exact count is missing', () => {
  assert.equal(getGuestLabel({ expected_guest_count: null, guest_count_range: '51-100' }), '51-100')
  assert.equal(getGuestLabel({ expected_guest_count: null, guest_count_range: '100-plus' }), '100+')
})

test('status labels are human-readable', () => {
  assert.equal(getStatusLabel('pending'), 'Pending')
  assert.equal(getStatusLabel('contacted'), 'Contacted')
  assert.equal(getStatusLabel('confirmed'), 'Confirmed')
  assert.equal(getStatusLabel('cancelled'), 'Cancelled')
})

test('NULL status displays neutral Not Set', () => {
  assert.equal(getStatusLabel(null), 'Not Set')
})

test('admin menu includes active Celebration Enquiries List route only in admin header', async () => {
  const [header, publicHeader] = await Promise.all([
    read('src/components/admin/AdminHeader.tsx'),
    read('src/components/Header.tsx'),
  ])
  assert.match(header, /Celebration Enquiries List/)
  assert.match(header, /pathname\.startsWith\(`\$\{href\}\/`\)/)
  assert.doesNotMatch(publicHeader, /Celebration Enquiries List/)
})
