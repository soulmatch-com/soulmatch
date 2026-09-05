import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { CELEBRATION_BOT_TOKEN_HEADER, CELEBRATION_TURNSTILE_ACTION, MAX_TURNSTILE_TOKEN_LENGTH, verifyTurnstileToken } from '../src/lib/celebrations/bot-verification-core.ts'
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

test('missing and oversized challenge tokens are rejected without provider calls', async () => {
  let calls = 0
  const request = async () => { calls++; return Response.json({ success: true }) }
  assert.deepEqual(await verifyTurnstileToken({ token: '', secret: 'secret', request }), { status: 'invalid' })
  assert.deepEqual(await verifyTurnstileToken({ token: 'x'.repeat(MAX_TURNSTILE_TOKEN_LENGTH + 1), secret: 'secret', request }), { status: 'invalid' })
  assert.equal(calls, 0)
})

test('successful provider response requires expected action and optional hostname', async () => {
  const request = async () => Response.json({ success: true, action: CELEBRATION_TURNSTILE_ACTION, hostname: 'example.com' })
  assert.deepEqual(await verifyTurnstileToken({ token: 'valid', secret: 'secret', allowedHostnames: ['example.com'], request }), { status: 'valid' })
  assert.deepEqual(await verifyTurnstileToken({ token: 'valid', secret: 'secret', allowedHostnames: ['other.example'], request }), { status: 'invalid' })
})

test('unsuccessful provider response and action mismatch are rejected', async () => {
  assert.deepEqual(await verifyTurnstileToken({ token: 'invalid', secret: 'secret', request: async () => Response.json({ success: false }) }), { status: 'invalid' })
  assert.deepEqual(await verifyTurnstileToken({ token: 'invalid', secret: 'secret', request: async () => Response.json({ success: true, action: 'other' }) }), { status: 'invalid' })
})

test('provider transport failure is normalized as unavailable', async () => {
  assert.deepEqual(await verifyTurnstileToken({ token: 'valid', secret: 'secret', request: async () => { throw new Error('provider detail') } }), { status: 'unavailable' })
  assert.deepEqual(await verifyTurnstileToken({ token: 'valid', secret: 'secret', request: async () => new Response('', { status: 503 }) }), { status: 'unavailable' })
})

test('only token and secret are sent to Siteverify without customer data or IP', async () => {
  let providerBody
  await verifyTurnstileToken({ token: 'valid', secret: 'secret', request: async (_url, init) => { providerBody = JSON.parse(init.body); return Response.json({ success: true, action: CELEBRATION_TURNSTILE_ACTION }) } })
  assert.deepEqual(providerBody, { secret: 'secret', response: 'valid' })
})

test('client sends challenge only in the dedicated header', async () => {
  let captured
  await submitCelebrationEnquiry(valid(), 'challenge-token', async (_url, init) => { captured = init; return Response.json({ success: true, enquiryId: '11111111-1111-4111-8111-111111111111' }, { status: 201 }) })
  assert.equal(captured.headers['X-Celebration-Bot-Token'], 'challenge-token')
  assert.equal(CELEBRATION_BOT_TOKEN_HEADER, 'x-celebration-bot-token')
  assert.doesNotMatch(captured.body, /challenge-token|turnstile|botToken/i)
})

test('client normalizes challenge rejection and provider unavailability', async () => {
  assert.deepEqual(await submitCelebrationEnquiry(valid(), 'token', async () => new Response('{}', { status: 403 })), { ok: false, kind: 'challenge' })
  assert.deepEqual(await submitCelebrationEnquiry(valid(), 'token', async () => new Response('{}', { status: 503 })), { ok: false, kind: 'verification-unavailable' })
})

test('rate limiting remains before bot verification and privileged operations', async () => {
  const source = await read('src/app/api/celebrations/enquiries/route.ts')
  const limiter = source.indexOf('checkCelebrationEnquiryRateLimit(request)')
  const bot = source.indexOf('verifyCelebrationBotChallenge(')
  assert.ok(limiter > -1 && limiter < bot)
  assert.ok(bot < source.indexOf('request.text()'))
  assert.ok(bot < source.indexOf('createAdminClient()'))
})

test('production bot configuration fails closed while development may bypass', async () => {
  const source = await read('src/lib/celebrations/bot-verification.ts')
  assert.match(source, /process\.env\.NODE_ENV !== 'production'/)
  assert.match(source, /status: 'misconfigured'/)
  assert.match(source, /result\.status === 'unavailable'/)
  assert.doesNotMatch(source, /console\.(log|error)\([^\n]*(token|secret)/i)
})

test('final-step widget gates submit and refreshes consumed tokens without resetting form data', async () => {
  const form = await read('src/components/celebrations/CelebrationEnquiryForm.tsx')
  assert.match(form, /step === 4.*TurnstileChallenge/)
  assert.match(form, /challengeRequired && !botToken/)
  assert.match(form, /setChallengeVersion\(\(current\) => current \+ 1\)/)
  assert.doesNotMatch(form, /reset\(/)
  assert.match(form, /disabled=\{isSubmitting/)
})
