import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('V2 remains disabled by default and legacy plan remains available', async () => {
  const [config, page] = await Promise.all([
    read('src/lib/celebrations/plan-v2.ts'),
    read('src/app/(en)/celebrations/thirukadaiyur/plan/page.tsx'),
  ])
  assert.match(config, /process\.env\.CELEBRATION_PLAN_V2_ENABLED === 'true'/)
  assert.match(page, /celebrationPlanV2Enabled \? <PlanV2Flow/)
  assert.match(page, /<CelebrationEnquiryForm services=\{services\} initialCeremony=\{initialCeremony\}/)
})

test('only Basic and Premium plan types exist in V2 definitions', async () => {
  const source = await read('src/lib/celebrations/celebration-plans.ts')
  assert.match(source, /celebrationPlanTypes = \['basic', 'premium'\]/)
  assert.match(source, /name: 'Basic Plan'/)
  assert.match(source, /name: 'Premium Plan'/)
  assert.doesNotMatch(source, /essential|starter|preset/i)
})

test('Basic plan definition matches approved fixed content', async () => {
  const source = await read('src/lib/celebrations/celebration-plans.ts')
  for (const text of ['Pooja and Homam with 16 Kalasam', 'Conducted in a common/shared space', 'Air-conditioned hall', 'Minimal decoration', 'Breakfast with coffee', 'Rooms arranged for 10 guests', 'Synthetic album — 120 photos with acrylic pad', 'Common Mangala Isai team']) assert.match(source, new RegExp(text))
})

test('Premium plan definition matches approved fixed content', async () => {
  const source = await read('src/lib/celebrations/celebration-plans.ts')
  for (const text of ['Conducted in a private space', 'Private hall', 'Aashirvaadham conducted in the same space', 'Trendy synthetic album — 120 photos', 'Moderate artificial flower decoration', 'Additional decoration available at extra cost', 'Special Mangala Isai team']) assert.match(source, new RegExp(text))
})

test('session remains an independent selectable V2 choice', async () => {
  const source = `${await read('src/components/celebrations/ArrangementSelector.tsx')}\n${await read('src/lib/celebrations/plan-v2.ts')}`
  assert.match(source, /legend="Session"/)
  assert.match(source, /one_session|two_sessions/)
  assert.doesNotMatch(await read('src/lib/celebrations/celebration-plans.ts'), /Morning session only/)
})

test('guest count is independent planning information and does not alter plan definitions', async () => {
  const [plans, selector] = await Promise.all([
    read('src/lib/celebrations/celebration-plans.ts'),
    read('src/components/celebrations/ArrangementSelector.tsx'),
  ])
  assert.match(selector, /Guest Count/)
  assert.match(selector, /does not change plan inclusions/)
  assert.doesNotMatch(plans, /guestPreset|customGuestCount|50 Guests|100 Guests/)
})
