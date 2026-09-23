import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { SubscriberService } from '../src/modules/notifications/subscribers/subscriber-service.ts'
import { DuplicateSubscriberError } from '../src/modules/notifications/subscribers/subscriber-types.ts'
import { subscribeRequestSchema } from '../src/modules/notifications/subscribers/subscriber-validation.ts'

const timestamp = '2026-09-23T12:00:00.000Z'

class MemorySubscriberRepository {
  records = []
  async findByEmail(email) { return this.records.find((record) => record.email === email) ?? null }
  async create(input, now) {
    const record = { id: String(this.records.length + 1), email: input.email, preferredLocale: input.locale, status: 'subscribed', consentSource: input.source, consentedAt: now, unsubscribedAt: null, createdAt: now, updatedAt: now }
    this.records.push(record)
    return record
  }
  async resubscribe(existing, input, now) {
    Object.assign(existing, { status: 'subscribed', preferredLocale: input.locale, consentSource: input.source, consentedAt: now, unsubscribedAt: null, updatedAt: now })
    return existing
  }
}

const payload = (overrides = {}) => ({ email: 'User@Example.COM ', consent: true, locale: 'en', source: 'blog_listing', ...overrides })
const parsed = (overrides = {}) => {
  const result = subscribeRequestSchema.safeParse(payload(overrides))
  assert.equal(result.success, true)
  return result.data
}

test('valid English subscription is accepted and normalized', async () => {
  const repository = new MemorySubscriberRepository()
  const result = await new SubscriberService(repository, () => timestamp).subscribe(parsed())
  assert.deepEqual(result, { status: 'subscribed' })
  assert.equal(repository.records[0].email, 'user@example.com')
  assert.equal(repository.records[0].preferredLocale, 'en')
})

test('valid Tamil subscription is accepted', async () => {
  const repository = new MemorySubscriberRepository()
  await new SubscriberService(repository, () => timestamp).subscribe(parsed({ locale: 'ta' }))
  assert.equal(repository.records[0].preferredLocale, 'ta')
})

test('invalid email, false or missing consent, locale, and source are rejected', () => {
  assert.equal(subscribeRequestSchema.safeParse(payload({ email: 'not-an-email' })).success, false)
  assert.equal(subscribeRequestSchema.safeParse(payload({ consent: false })).success, false)
  const { consent: _consent, ...withoutConsent } = payload()
  assert.equal(subscribeRequestSchema.safeParse(withoutConsent).success, false)
  assert.equal(subscribeRequestSchema.safeParse(payload({ locale: 'fr' })).success, false)
  assert.equal(subscribeRequestSchema.safeParse(payload({ source: 'https://unsafe.example' })).success, false)
})

test('case-insensitive duplicate returns already_subscribed without a second row or locale change', async () => {
  const repository = new MemorySubscriberRepository()
  const service = new SubscriberService(repository, () => timestamp)
  await service.subscribe(parsed({ locale: 'en' }))
  const result = await service.subscribe(parsed({ email: 'user@example.com', locale: 'ta' }))
  assert.deepEqual(result, { status: 'already_subscribed' })
  assert.equal(repository.records.length, 1)
  assert.equal(repository.records[0].preferredLocale, 'en')
})

test('a concurrent unique-email conflict remains idempotent', async () => {
  const repository = new MemorySubscriberRepository()
  repository.create = async (input, now) => {
    await MemorySubscriberRepository.prototype.create.call(repository, input, now)
    throw new DuplicateSubscriberError('conflict')
  }
  const result = await new SubscriberService(repository, () => timestamp).subscribe(parsed())
  assert.deepEqual(result, { status: 'already_subscribed' })
  assert.equal(repository.records.length, 1)
})

test('an unsubscribed user is resubscribed in the same row with renewed consent and locale', async () => {
  const repository = new MemorySubscriberRepository()
  const service = new SubscriberService(repository, () => timestamp)
  await service.subscribe(parsed())
  const record = repository.records[0]
  Object.assign(record, { status: 'unsubscribed', unsubscribedAt: '2026-09-22T12:00:00.000Z', consentedAt: '2026-09-21T12:00:00.000Z' })
  const result = await service.subscribe(parsed({ locale: 'ta', source: 'blog_article' }))
  assert.deepEqual(result, { status: 'resubscribed' })
  assert.equal(repository.records.length, 1)
  assert.equal(record.unsubscribedAt, null)
  assert.equal(record.consentedAt, timestamp)
  assert.equal(record.preferredLocale, 'ta')
  assert.equal(record.consentSource, 'blog_article')
})

test('client-controlled status and timestamps are rejected', () => {
  assert.equal(subscribeRequestSchema.safeParse(payload({ status: 'unsubscribed' })).success, false)
  assert.equal(subscribeRequestSchema.safeParse(payload({ consented_at: timestamp })).success, false)
})

test('migration protects private data and uses no provider or queue', () => {
  const migration = readFileSync(new URL('../supabase/migrations/add_email_subscribers.sql', import.meta.url), 'utf8')
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /REVOKE ALL ON TABLE public\.email_subscribers FROM PUBLIC, anon, authenticated/)
  assert.match(migration, /UNIQUE INDEX[\s\S]*lower\(email\)/)
  assert.doesNotMatch(migration, /resend|sendgrid|postmark|smtp|notification_jobs|email_jobs/i)
})

test('public API exposes only subscriber status and does not log email', () => {
  const route = readFileSync(new URL('../src/app/api/notifications/subscribers/route.ts', import.meta.url), 'utf8')
  assert.match(route, /new SubscriberService\(new SupabaseSubscriberRepository\(\)\)/)
  assert.doesNotMatch(route, /console\.(?:log|error)[\s\S]*parsed\.data\.email/)
  assert.doesNotMatch(route, /subscriber_id|consented_at|created_at/)
})
