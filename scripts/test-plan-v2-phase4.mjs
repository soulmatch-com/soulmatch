import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('Details context displays ceremony, guest count, plan, session and add-ons without duplicate inputs', async () => {
  const source = await read('src/components/celebrations/PlanDetailsScreen.tsx')
  for (const label of ['Expected Guests', 'Plan', 'Session', 'Add-ons']) assert.match(source, new RegExp(label))
  assert.match(source, /formatPlanGuestCount\(selection\)/)
  assert.doesNotMatch(source, /name="guest|id="guestCount|name="duration|id="duration|serviceIds|selectedServiceCodes/)
})

test('Details implements supported Event, Couple and Contact fields only', async () => {
  const source = await read('src/components/celebrations/PlanDetailsScreen.tsx')
  for (const field of ['preferredDate', 'alternativeDate', 'travellingFrom', 'additionalRequirements', 'husbandName', 'wifeName', 'husbandDob', 'wifeDob', 'contactName', 'mobile', 'email', 'relationship', 'preferredContactMethod']) {
    assert.match(source, new RegExp(`id="${field}"`))
  }
  assert.doesNotMatch(source, /dateNotDecided|dobUnknown|roomsRequired|whatsappNumber|preferredLanguage/)
})

test('Preferred date and DOB validation reuse current date-only helpers and age rules', async () => {
  const source = await read('src/lib/celebrations/plan-v2-details.ts')
  assert.match(source, /getCelebrationDateBounds/)
  assert.match(source, /compareDateOnlyStrings/)
  assert.match(source, /getAlternativeDateConflictMessage/)
  assert.match(source, /Preferred date cannot be in the past/)
  assert.match(source, /Date of birth cannot be in the future/)
  assert.match(source, /must be at least 18 years old/)
})

test('Optional astrology remains collapsed and optional', async () => {
  const [screen, schema] = await Promise.all([
    read('src/components/celebrations/PlanDetailsScreen.tsx'),
    read('src/lib/celebrations/plan-v2-details.ts'),
  ])
  assert.match(screen, /Optional Traditional Details/)
  assert.match(screen, /hidden=\{!traditionalOpen\}/)
  for (const field of ['husbandNakshatra', 'husbandRasi', 'wifeNakshatra', 'wifeRasi']) assert.match(schema, new RegExp(`${field}: optionalText`))
})

test('Terms and Privacy acknowledgement is unchecked by default, required, and links to valid routes', async () => {
  const [screen, schema] = await Promise.all([
    read('src/components/celebrations/PlanDetailsScreen.tsx'),
    read('src/lib/celebrations/plan-v2-details.ts'),
  ])
  assert.match(screen, /checked=\{details\.termsPrivacyAcknowledged === true\}/)
  assert.match(screen, /href="\/terms"/)
  assert.match(screen, /href="\/privacy"/)
  assert.match(schema, /termsPrivacyAcknowledged: z\.literal\(true/)
})

test('Details navigation is Plan back and Review forward', async () => {
  const flow = await read('src/components/celebrations/PlanV2Flow.tsx')
  assert.match(flow, /onBack=\{\(\) => setView\('plan'\)\}/)
  assert.match(flow, /onContinue=\{\(\) => setView\('review'\)\}/)
  assert.match(flow, /<PlanReviewScreen/)
  assert.doesNotMatch(flow, /setView\('customise'\)/)
})

test('Tamil Details copy is valid UTF-8', async () => {
  const source = await read('src/components/celebrations/PlanDetailsScreen.tsx')
  assert.match(source, /விழா மற்றும் தொடர்பு விவரங்கள்/)
  assert.doesNotMatch(source, /à|Â|Ã|�/)
})
