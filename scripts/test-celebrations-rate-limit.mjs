import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { CELEBRATION_RATE_LIMIT_CAPACITY, CELEBRATION_RATE_LIMIT_WINDOW_MS, checkSharedCelebrationRateLimit, hashRateLimitIdentifier } from '../src/lib/celebrations/rate-limit-core.ts'
import { celebrationEnquiryApiSchema } from '../src/lib/validations/celebration-enquiry-api.schema.ts'
import { submitCelebrationEnquiry } from '../src/lib/celebrations/client-submission.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const valid = () => celebrationEnquiryApiSchema.parse({
  celebrationType: '60th-marriage', husbandName: 'Test Husband', wifeName: 'Test Wife',
  husbandDob: '1960-01-01', wifeDob: '1962-01-01', preferredDate: '2027-01-01',
  guestCountRange: '20-50', travellingFrom: 'Test City', arrangementPreference: 'ceremony-only',
  contactName: 'Test Contact', mobile: '+10000000000', relationship: 'Family Member',
  preferredContactMethod: 'phone', serviceIds: ['11111111-1111-4111-8111-111111111111'],
})

test('shared token bucket allows requests below the limit', async () => {
  let command
  const result = await checkSharedCelebrationRateLimit({
    url: 'https://redis.test', token: 'secret', key: 'opaque-key',
    request: async (_url, init) => { command = JSON.parse(init.body); return Response.json({ result: [1, 4, 0] }) },
  })
  assert.deepEqual(result, { allowed: true })
  assert.equal(command[0], 'EVAL')
  assert.equal(command.at(-2), String(CELEBRATION_RATE_LIMIT_CAPACITY))
  assert.equal(command.at(-1), String(CELEBRATION_RATE_LIMIT_WINDOW_MS))
})

test('shared token bucket returns a deterministic retry delay over limit', async () => {
  const result = await checkSharedCelebrationRateLimit({ url: 'https://redis.test', token: 'secret', key: 'opaque-key', request: async () => Response.json({ result: [0, 0, 87] }) })
  assert.deepEqual(result, { allowed: false, retryAfterSeconds: 87 })
})

test('provider failures are surfaced to the server-only failure policy', async () => {
  await assert.rejects(checkSharedCelebrationRateLimit({ url: 'https://redis.test', token: 'secret', key: 'opaque-key', request: async () => new Response('', { status: 503 }) }), /Rate-limit store request failed/)
})

test('identifier stored by the limiter is an opaque keyed digest', () => {
  const raw = '203.0.113.10'
  const digest = hashRateLimitIdentifier(raw, 'test-only-salt')
  assert.notEqual(digest, raw)
  assert.doesNotMatch(digest, /203\.0\.113\.10/)
  assert.equal(digest.length, 64)
})

test('route checks limiter before body parsing and privileged RPC creation', async () => {
  const source = await read('src/app/api/celebrations/enquiries/route.ts')
  assert.ok(source.indexOf('checkCelebrationEnquiryRateLimit(request)') < source.indexOf('request.text()'))
  assert.ok(source.indexOf('checkCelebrationEnquiryRateLimit(request)') < source.indexOf('createAdminClient()'))
  assert.match(source, /status: 429/)
  assert.match(source, /'Retry-After'/)
})

test('rate limiting is scoped to the celebration enquiry route', async () => {
  for (const path of ['middleware.ts', 'src/lib/supabase/middleware.ts']) assert.doesNotMatch(await read(path), /checkCelebrationEnquiryRateLimit/)
})

test('client normalizes 429 without exposing provider details', async () => {
  const result = await submitCelebrationEnquiry(valid(), async () => new Response(JSON.stringify({ message: 'provider internals' }), { status: 429, headers: { 'Retry-After': '120' } }))
  assert.deepEqual(result, { ok: false, kind: 'rate-limited' })
})

test('form preserves values and presents the safe 429 message', async () => {
  const source = await read('src/components/celebrations/CelebrationEnquiryForm.tsx')
  assert.match(source, /result\.kind === 'rate-limited'/)
  assert.match(source, /Too many requests\. Please wait a little while and try again\./)
  assert.doesNotMatch(source, /reset\(/)
  assert.match(source, /disabled=\{isSubmitting\}/)
})
